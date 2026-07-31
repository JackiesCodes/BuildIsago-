import Link from 'next/link';
import { formatMoney } from '@/lib/utils/money';
import { productCategoryLabel } from '@/lib/constants/productCategories';

export default function ProductCard({ product }) {
  return (
    <Link href={`/store/${product.slug}`} className="product-card">
      <div className="product-card-image">
        {product.previewUrl ? <img src={product.previewUrl} alt="" /> : <div className="product-card-placeholder" />}
      </div>
      <div className="product-card-body">
        <span className="service-tag">{productCategoryLabel(product.category)}</span>
        <h3>{product.title}</h3>
        <span className="product-card-price">
          {Number(product.price) === 0 ? 'Free' : formatMoney(product.price, product.currency)}
        </span>
      </div>
    </Link>
  );
}
