import { productFormSchema } from '../src/lib/validation/product-form.js';

const testInputs = [
  { category_id: '', brand_id: '' },
  { category_id: null, brand_id: null },
  { category_id: undefined, brand_id: undefined },
  { category_id: '__none__', brand_id: '__none__' },
  { category_id: 'some-non-uuid', brand_id: 'some-non-uuid' },
  { category_id: '836faa3c-9ca1-4fc3-a208-08200ff59c7c', brand_id: '836faa3c-9ca1-4fc3-a208-08200ff59c7c' },
];

testInputs.forEach((input, index) => {
  const result = productFormSchema.safeParse({
    name: 'Test Product',
    slug: 'test-product',
    price: 100,
    stock: 10,
    section: 'best_selling',
    images: [{ url: 'https://example.com/img.jpg' }],
    ...input,
  });

  if (result.success) {
    console.log(`Input ${index} succeeded:`, result.data.category_id, result.data.brand_id);
  } else {
    console.log(`Input ${index} failed:`, result.error.format());
  }
});
