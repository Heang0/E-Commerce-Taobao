window.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');

  if (!id) {
    console.error("❌ No product ID provided in URL.");
    return;
  }

  fetch(`/api/products/${id}`)
    .then(response => {
      if (!response.ok) throw new Error("Product not found");
      return response.json();
    })
    .then(product => {
      if (!product) throw new Error("No product data returned.");

      document.getElementById('product-name').textContent = product.name;
      document.getElementById('product-price').textContent = product.price.toFixed(2);
      document.getElementById('product-description').textContent = product.description || '';
      document.getElementById('product-image').src = product.image_url;
      document.getElementById('product-image').alt = product.name;
    })
    .catch(error => {
      console.error("❌ Error loading product:", error);
      document.getElementById('product-name').textContent = 'Product Not Found';
      document.getElementById('product-price').textContent = '--';
      document.getElementById('product-description').textContent = 'Sorry, this product could not be loaded.';
      document.getElementById('product-image').src = '';
    });
});