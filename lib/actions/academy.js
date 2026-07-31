'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { randomUUID } from 'crypto';
import { createClient, getSessionProfile } from '@/lib/supabase/server';
import { getStripe } from '@/lib/stripe';
import { getOrigin } from '@/lib/utils/origin';
import { notifyUser, notifyStudio } from '@/lib/notifications';

function paths(slug, courseId) {
  revalidatePath('/academy');
  revalidatePath('/dashboard/studio/academy');
  revalidatePath('/dashboard/academy');
  if (slug) revalidatePath(`/academy/${slug}`);
  if (courseId) {
    revalidatePath(`/dashboard/studio/academy/${courseId}`);
    revalidatePath(`/dashboard/academy/${courseId}`);
  }
}

function slugify(text) {
  return (text || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

export async function createCourse() {
  const { user, profile } = await getSessionProfile();
  if (!user || profile?.role !== 'studio') redirect('/login');

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('courses')
    .insert({ created_by: user.id, slug: `course-${randomUUID().slice(0, 8)}` })
    .select('id')
    .single();
  if (error) return { error: error.message };

  paths();
  redirect(`/dashboard/studio/academy/${data.id}`);
}

export async function updateCourse(courseId, payload) {
  const { user, profile } = await getSessionProfile();
  if (!user || profile?.role !== 'studio') redirect('/login');

  const slug = slugify(payload.slug || payload.title);
  if (!slug) return { error: 'Give the course a title or a URL slug.' };

  const supabase = await createClient();
  const { error } = await supabase
    .from('courses')
    .update({
      title: payload.title?.trim() || 'New Course',
      slug,
      description: payload.description || null,
      level: payload.level,
      price: Number(payload.price) || 0,
      currency: payload.currency,
    })
    .eq('id', courseId);

  if (error) {
    if (error.code === '23505') return { error: 'That URL slug is already taken by another course.' };
    return { error: error.message };
  }

  paths(slug, courseId);
  return { error: null };
}

export async function recordCourseCover(courseId, storagePath) {
  const { user, profile } = await getSessionProfile();
  if (!user || profile?.role !== 'studio') redirect('/login');

  const supabase = await createClient();
  const { error } = await supabase.from('courses').update({ cover_image_path: storagePath }).eq('id', courseId);
  if (error) return { error: error.message };

  paths(null, courseId);
  return { error: null };
}

export async function publishCourse(courseId) {
  const { user, profile } = await getSessionProfile();
  if (!user || profile?.role !== 'studio') redirect('/login');

  const supabase = await createClient();
  const { data: course, error: fetchError } = await supabase
    .from('courses')
    .select('title, slug')
    .eq('id', courseId)
    .single();
  if (fetchError || !course) return { error: 'Course not found.' };

  const { count } = await supabase
    .from('course_lessons')
    .select('id', { count: 'exact', head: true })
    .eq('course_id', courseId);
  if (!count) return { error: 'Add at least one lesson before publishing.' };

  const { error } = await supabase.from('courses').update({ status: 'published' }).eq('id', courseId);
  if (error) return { error: error.message };

  paths(course.slug, courseId);
  return { error: null };
}

export async function unpublishCourse(courseId) {
  const { user, profile } = await getSessionProfile();
  if (!user || profile?.role !== 'studio') redirect('/login');

  const supabase = await createClient();
  const { data: course } = await supabase.from('courses').select('slug').eq('id', courseId).single();
  const { error } = await supabase.from('courses').update({ status: 'draft' }).eq('id', courseId);
  if (error) return { error: error.message };

  paths(course?.slug, courseId);
  return { error: null };
}

export async function archiveCourse(courseId) {
  const { user, profile } = await getSessionProfile();
  if (!user || profile?.role !== 'studio') redirect('/login');

  const supabase = await createClient();
  const { data: course } = await supabase.from('courses').select('slug').eq('id', courseId).single();
  const { error } = await supabase.from('courses').update({ status: 'archived' }).eq('id', courseId);
  if (error) return { error: error.message };

  paths(course?.slug, courseId);
  return { error: null };
}

export async function deleteCourse(courseId) {
  const { user, profile } = await getSessionProfile();
  if (!user || profile?.role !== 'studio') redirect('/login');

  const supabase = await createClient();
  const { count } = await supabase
    .from('course_enrollments')
    .select('id', { count: 'exact', head: true })
    .eq('course_id', courseId);
  if (count) return { error: "This course has enrollments and can't be deleted — archive it instead." };

  const { error } = await supabase.from('courses').delete().eq('id', courseId);
  if (error) return { error: error.message };

  paths();
  return { error: null };
}

// ============================================
// Lessons (studio-only, direct table access via RLS — mirrors how the
// studio side of every other feature works here).
// ============================================
export async function createLesson(courseId) {
  const { user, profile } = await getSessionProfile();
  if (!user || profile?.role !== 'studio') redirect('/login');

  const supabase = await createClient();
  const { data: last } = await supabase
    .from('course_lessons')
    .select('lesson_position')
    .eq('course_id', courseId)
    .order('lesson_position', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from('course_lessons').insert({
    course_id: courseId,
    lesson_position: (last?.lesson_position ?? -1) + 1,
  });
  if (error) return { error: error.message };

  paths(null, courseId);
  return { error: null };
}

export async function updateLesson(lessonId, payload) {
  const { user, profile } = await getSessionProfile();
  if (!user || profile?.role !== 'studio') redirect('/login');

  const supabase = await createClient();
  const { data: lesson, error } = await supabase
    .from('course_lessons')
    .update({
      title: payload.title?.trim() || 'New Lesson',
      content_type: payload.contentType,
      video_url: payload.videoUrl || null,
      body: payload.body || null,
      duration_minutes: payload.durationMinutes === '' ? null : Number(payload.durationMinutes) || null,
      is_preview: Boolean(payload.isPreview),
    })
    .eq('id', lessonId)
    .select('course_id')
    .single();
  if (error) return { error: error.message };

  paths(null, lesson.course_id);
  return { error: null };
}

export async function deleteLesson(lessonId) {
  const { user, profile } = await getSessionProfile();
  if (!user || profile?.role !== 'studio') redirect('/login');

  const supabase = await createClient();
  const { data: lesson } = await supabase.from('course_lessons').select('course_id').eq('id', lessonId).single();
  const { error } = await supabase.from('course_lessons').delete().eq('id', lessonId);
  if (error) return { error: error.message };

  paths(null, lesson?.course_id);
  return { error: null };
}

export async function moveLesson(lessonId, direction) {
  const { user, profile } = await getSessionProfile();
  if (!user || profile?.role !== 'studio') redirect('/login');

  const supabase = await createClient();
  const { data: lesson } = await supabase
    .from('course_lessons')
    .select('id, course_id, lesson_position')
    .eq('id', lessonId)
    .single();
  if (!lesson) return { error: 'Lesson not found.' };

  let neighborQuery = supabase
    .from('course_lessons')
    .select('id, lesson_position')
    .eq('course_id', lesson.course_id)
    .limit(1);
  neighborQuery =
    direction === 'up'
      ? neighborQuery.lt('lesson_position', lesson.lesson_position).order('lesson_position', { ascending: false })
      : neighborQuery.gt('lesson_position', lesson.lesson_position).order('lesson_position', { ascending: true });

  const { data: neighbor } = await neighborQuery.maybeSingle();
  if (!neighbor) return { error: null };

  await supabase.from('course_lessons').update({ lesson_position: lesson.lesson_position }).eq('id', neighbor.id);
  await supabase.from('course_lessons').update({ lesson_position: neighbor.lesson_position }).eq('id', lesson.id);

  paths(null, lesson.course_id);
  return { error: null };
}

// ============================================
// Student side: enrolling and tracking progress.
// ============================================
export async function buyCourse(slug) {
  const { user, profile, supabase } = await getSessionProfile();
  if (!user) redirect(`/login?next=/academy/${slug}`);

  const { data: course, error: fetchError } = await supabase
    .rpc('get_published_course', { p_slug: slug })
    .maybeSingle();
  if (fetchError || !course) return { error: 'This course is not available.' };

  if (Number(course.price) === 0) {
    const { error } = await supabase.rpc('claim_free_course', { p_course_id: course.id });
    if (error) return { error: error.message };

    const studentName = profile?.full_name || user.email;
    await notifyStudio({
      subject: `Free enrollment: ${course.title}`,
      text: `${studentName} enrolled in the free course "${course.title}".`,
    });
    await notifyUser(user.id, {
      subject: `You're enrolled: ${course.title}`,
      text: `You're in! Start learning any time from your BuildIsago account.\n\n${await getOrigin()}/dashboard/academy/${course.id}`,
    });

    redirect(`/dashboard/academy/${course.id}?enrolled=1`);
  }

  let stripe;
  try {
    stripe = getStripe();
  } catch {
    return { error: 'Online payment is not configured yet. Please check back soon.' };
  }

  const origin = await getOrigin();
  let session;
  try {
    session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: course.currency,
            product_data: { name: course.title },
            unit_amount: Math.round(Number(course.price) * 100),
          },
          quantity: 1,
        },
      ],
      success_url: `${origin}/dashboard/academy/${course.id}?enrolled=1`,
      cancel_url: `${origin}/academy/${slug}`,
      metadata: { type: 'course', course_id: course.id, buyer_id: user.id },
    });
  } catch (err) {
    console.error('Stripe checkout session failed for course', course.id, err);
    return { error: 'Could not start checkout. Please try again.' };
  }

  redirect(session.url);
}

export async function toggleLessonComplete(lessonId, complete) {
  const { user, supabase } = await getSessionProfile();
  if (!user) redirect('/login');

  const { error } = await supabase.rpc('set_lesson_complete', { p_lesson_id: lessonId, p_complete: complete });
  if (error) return { error: error.message };

  return { error: null };
}
