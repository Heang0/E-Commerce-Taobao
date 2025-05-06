// document.getElementById('checkoutForm').addEventListener('submit', function (e) {
//     e.preventDefault();
  
//     const customerName = document.getElementById('name').value;
//     const customerEmail = document.getElementById('email').value;
//     const customerAddress = document.getElementById('address').value;
//     const customerPhone = document.getElementById('phone').value;
//     const paymentScreenshotFile = document.getElementById('paymentScreenshot').files[0];
  
//     const cart = JSON.parse(localStorage.getItem('cart')) || [];
  
//     const totalAmount = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  
//     const cartItems = cart.map(item => ({
//       productId: item.id,
//       quantity: item.quantity,
//       size: item.size || 'N/A'
//     }));
  
//     const formData = new FormData();
//     formData.append('customerName', customerName);
//     formData.append('customerEmail', customerEmail);
//     formData.append('customerAddress', customerAddress);
//     formData.append('customerPhone', customerPhone);
//     formData.append('totalAmount', totalAmount);
//     formData.append('paymentScreenshot', paymentScreenshotFile);
//     formData.append('cartItems', JSON.stringify(cartItems)); 
//     fetch('/api/orders', {
//       method: 'POST',
//       body: formData
//     })
//       .then(res => res.json())
//       .then(data => {
//         alert(data.message || 'Order placed!');
//         localStorage.removeItem('cart');
//         window.location.href = '/';
//       })
//       .catch(err => {
//         console.error('❌ Error placing order:', err);
//         alert('❌ Failed to place order');
//       });
//   });
  