import { Link, useNavigate, useParams } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import ProductForm from '../components/ProductForm';
import { toFormValues } from '../lib/productForm';
import { useProducts } from '../store/ProductsContext';

export default function EditProductPage() {
  const { productId = '' } = useParams();
  const navigate = useNavigate();
  const { products, getProduct, updateProduct } = useProducts();
  const product = getProduct(productId);

  if (!product) {
    return (
      <>
        <PageHeader title="Product not found" backLink={{ to: '/products', label: 'Back to products' }} />
        <div className="card empty-state">
          <p>This product doesn't exist or may have been removed.</p>
          <Link to="/products">View all products</Link>
        </div>
      </>
    );
  }

  const detailPath = `/products/${product.id}`;

  return (
    <>
      <PageHeader title={`Edit ${product.title}`} backLink={{ to: detailPath, label: 'Back to product' }} />
      <ProductForm
        key={product.id}
        initialValues={toFormValues(product)}
        existingProducts={products}
        currentId={product.id}
        submitLabel="Save changes"
        onSubmit={(values) => {
          updateProduct(product.id, values);
          navigate(detailPath);
        }}
        onCancel={() => navigate(detailPath)}
      />
    </>
  );
}
