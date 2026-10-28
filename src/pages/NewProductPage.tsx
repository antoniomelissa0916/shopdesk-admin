import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import ProductForm from '../components/ProductForm';
import { emptyProductForm } from '../lib/productForm';
import { useProducts } from '../store/ProductsContext';

export default function NewProductPage() {
  const navigate = useNavigate();
  const { products, addProduct } = useProducts();

  return (
    <>
      <PageHeader title="Add product" backLink={{ to: '/products', label: 'Back to products' }} />
      <ProductForm
        initialValues={emptyProductForm()}
        existingProducts={products}
        submitLabel="Save product"
        onSubmit={(values) => {
          const product = addProduct(values);
          navigate(`/products/${product.id}`);
        }}
        onCancel={() => navigate('/products')}
      />
    </>
  );
}
