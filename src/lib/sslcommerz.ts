export interface SSLCommerzInitParams {
  total_amount: number;
  currency?: string;
  tran_id: string;
  success_url: string;
  fail_url: string;
  cancel_url: string;
  ipn_url?: string;
  shipping_method?: string;
  product_name: string;
  product_category?: string;
  product_profile?: string;
  cus_name: string;
  cus_email: string;
  cus_add1?: string;
  cus_city?: string;
  cus_state?: string;
  cus_postcode?: string;
  cus_country?: string;
  cus_phone: string;
  value_a?: string;
  value_b?: string;
  value_c?: string;
  value_d?: string;
}

export const initPayment = async (params: SSLCommerzInitParams) => {
  const store_id = process.env.SSLCOMMERZ_STORE_ID;
  const store_passwd = process.env.SSLCOMMERZ_STORE_PASSWORD;
  const is_live = process.env.SSLCOMMERZ_IS_LIVE === 'true';

  const baseUrl = is_live
    ? 'https://securepay.sslcommerz.com/gwprocess/v4/api.php'
    : 'https://sandbox.sslcommerz.com/gwprocess/v4/api.php';

  const data = new URLSearchParams();
  data.append('store_id', store_id!);
  data.append('store_passwd', store_passwd!);
  data.append('total_amount', params.total_amount.toString());
  data.append('currency', params.currency || 'BDT');
  data.append('tran_id', params.tran_id);
  data.append('success_url', params.success_url);
  data.append('fail_url', params.fail_url);
  data.append('cancel_url', params.cancel_url);
  if (params.ipn_url) data.append('ipn_url', params.ipn_url);
  
  data.append('shipping_method', params.shipping_method || 'NO');
  data.append('product_name', params.product_name);
  data.append('product_category', params.product_category || 'General');
  data.append('product_profile', params.product_profile || 'general');
  data.append('cus_name', params.cus_name);
  data.append('cus_email', params.cus_email);
  data.append('cus_add1', params.cus_add1 || 'Dhaka');
  data.append('cus_city', params.cus_city || 'Dhaka');
  data.append('cus_state', params.cus_state || 'Dhaka');
  data.append('cus_postcode', params.cus_postcode || '1000');
  data.append('cus_country', params.cus_country || 'Bangladesh');
  data.append('cus_phone', params.cus_phone);

  if (params.value_a) data.append('value_a', params.value_a);
  if (params.value_b) data.append('value_b', params.value_b);
  if (params.value_c) data.append('value_c', params.value_c);
  if (params.value_d) data.append('value_d', params.value_d);

  const response = await fetch(baseUrl, {
    method: 'POST',
    body: data,
  });

  const result = await response.json();
  return result;
};

export const validatePayment = async (val_id: string) => {
  const store_id = process.env.SSLCOMMERZ_STORE_ID;
  const store_passwd = process.env.SSLCOMMERZ_STORE_PASSWORD;
  const is_live = process.env.SSLCOMMERZ_IS_LIVE === 'true';

  const baseUrl = is_live
    ? 'https://securepay.sslcommerz.com/validator/api/validationserverAPI.php'
    : 'https://sandbox.sslcommerz.com/validator/api/validationserverAPI.php';

  const url = new URL(baseUrl);
  url.searchParams.append('val_id', val_id);
  url.searchParams.append('store_id', store_id!);
  url.searchParams.append('store_passwd', store_passwd!);
  url.searchParams.append('v', '1');
  url.searchParams.append('format', 'json');

  const response = await fetch(url.toString(), {
    method: 'GET',
  });

  const result = await response.json();
  return result;
};
