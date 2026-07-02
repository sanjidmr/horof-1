import { z } from 'zod';

const modifiedSchema = z.object({
  category_id: z
    .union([z.literal(''), z.literal('__none__'), z.string().uuid()])
    .optional()
    .nullable()
    .transform((v) => (!v || v === '__none__' ? null : v)),
  brand_id: z
    .union([z.literal(''), z.literal('__none__'), z.string().uuid()])
    .optional()
    .nullable()
    .transform((v) => (!v || v === '__none__' ? null : v)),
});

const testInputs = [
  { category_id: '', brand_id: '' },
  { category_id: null, brand_id: null },
  { category_id: undefined, brand_id: undefined },
  { category_id: '__none__', brand_id: '__none__' },
  { category_id: 'some-non-uuid', brand_id: 'some-non-uuid' },
  { category_id: '836faa3c-9ca1-4fc3-a208-08200ff59c7c', brand_id: '836faa3c-9ca1-4fc3-a208-08200ff59c7c' },
];

testInputs.forEach((input, index) => {
  const result = modifiedSchema.safeParse(input);
  if (result.success) {
    console.log(`Input ${index} succeeded:`, result.data.category_id, result.data.brand_id);
  } else {
    console.log(`Input ${index} failed:`, JSON.stringify(result.error.format(), null, 2));
  }
});
