// public/cart.js

const checkoutButton = document.getElementById('checkout-btn');
const checkoutForm = document.getElementById('checkout-form');
const orderForm = document.getElementById('order-form');

// --- Show Checkout Form ---
checkoutButton.addEventListener('click', () => {
    checkoutForm.style.display = 'block';
    checkoutButton.style.display = 'none'; // Hide the button after clicking
});

// --- Submit Order ---
orderForm.addEventListener('submit', (event) => {
    event.preventDefault(); // Prevent the default form submission
    placeOrder(); // Call the placeOrder function to handle the order submission
});

function placeOrder() {
    const customerName = document.getElementById('customerName').value;
    const customerEmail = document.getElementById('customerEmail').value;
    const customerAddress = document.getElementById('customerAddress').value;
    const customerPhone = document.getElementById('customerPhone').value;
    const paymentScreenshot = document.getElementById('paymentScreenshot').value;

    // Basic validation
    if (!customerName || !customerEmail || !customerAddress || !customerPhone || !paymentScreenshot) {
        alert('Please fill in all fields.');
        return;
    }

    // Prepare cart items for the server (assuming 'cart' is globally accessible)
    const cartItemsToSend = cart.map(item => ({
        productId: item.id,
        quantity: item.quantity,
        size: item.size,
        // Assuming you don't have color in this example
    }));

    const cartTotal = document.getElementById('cart-total').textContent;

    // Send order data to the server
    fetch('/api/orders', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            customerName: customerName,
            customerEmail: customerEmail,
            customerAddress: customerAddress,
            customerPhone: customerPhone,
            cartItems: cartItemsToSend,
            totalAmount: parseFloat(cartTotal),
            paymentScreenshot: paymentScreenshot,
        }),
    })
        .then(response => response.json())
        .then(data => {
            if (data.message === '✅ Order placed successfully!') {
                document.getElementById('order-id').textContent = data.orderId;
                document.getElementById('checkout-form').style.display = 'none';
                document.getElementById('order-confirmation').style.display = 'block';
                cart = []; // Clear the cart after successful order
                updateCartDisplay();
            } else {
                document.getElementById('order-error').style.display = 'block';
            }
        })
        .catch(error => {
            console.error('❌ Error placing order:', error);
            document.getElementById('order-error').style.display = 'block';
        });
}

// --- Initial Load ---
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('product-list')) {
        fetchProducts();
    }
    updateCartDisplay(); // Update cart count on all pages
});