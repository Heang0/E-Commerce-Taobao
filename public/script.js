let cart = JSON.parse(localStorage.getItem('cart')) || [];

function updateCartDisplay() {
    const cartItemCountSpan = document.querySelectorAll('#cart-item-count');
    cartItemCountSpan.forEach(span => {
        span.textContent = cart.reduce((sum, item) => sum + item.quantity, 0);
    });

    const cartItemsList = document.getElementById('cart-items');
    const cartTotalSpan = document.getElementById('cart-total');

    if (cartItemsList && cartTotalSpan) {
        cartItemsList.innerHTML = '';
        let total = 0;
        cart.forEach(item => {
            const listItem = document.createElement('li');
            listItem.className = 'list-group-item d-flex justify-content-between align-items-center';
            listItem.innerHTML = `
                ${item.name} (Qty: ${item.quantity}${item.size ? ', Size: ' + item.size : ''}) - $${(item.price * item.quantity).toFixed(2)}
            `;
            total += item.price * item.quantity;
            cartItemsList.appendChild(listItem);
        });
        cartTotalSpan.textContent = total.toFixed(2);
    }

    localStorage.setItem('cart', JSON.stringify(cart));
}

function addItemToCart(productId, name, price, size = '', image = '') {
    const existingItem = cart.find(item => item.id === productId && item.size === size);
    if (existingItem) {
        existingItem.quantity++;
    } else {
        cart.push({ id: productId, name, price, quantity: 1, size, image });
    }

    updateCartDisplay();
    renderDrawerCart();

    const drawer = document.getElementById('cart-drawer');
    if (drawer) drawer.classList.add('open');
}

function removeItemFromCart(productId, size = '') {
    cart = cart.filter(item => !(item.id === productId && item.size === size));
    updateCartDisplay();
    renderDrawerCart();
}

function updateItemQuantity(productId, size = '', action) {
    const item = cart.find(p => p.id === productId && p.size === size);
    if (!item) return;

    if (action === 'increase') {
        item.quantity++;
    } else if (action === 'decrease') {
        item.quantity--;
        if (item.quantity <= 0) return removeItemFromCart(productId, size);
    }

    updateCartDisplay();
    renderDrawerCart();
}

function renderDrawerCart() {
    const drawer = document.getElementById('drawer-cart-items');
    const drawerCount = document.getElementById('drawer-cart-count');
    const drawerTotal = document.getElementById('drawer-cart-total');

    if (!drawer || !drawerCount || !drawerTotal) return;

    drawer.innerHTML = '';
    let total = 0;

    cart.forEach(item => {
        const div = document.createElement('div');
        div.className = 'cart-item';
        div.innerHTML = `
            <img src="${item.image || 'images/default.jpg'}" alt="${item.name}">
            <div class="cart-item-details w-100">
                <div class="d-flex justify-content-between align-items-start">
                    <div>
                        <strong>${item.name}</strong><br/>
                        <small>Size: ${item.size || 'N/A'}</small>
                    </div>
                    <button class="remove-btn btn p-0 text-danger" title="Remove item"
                        data-id="${item.id}" data-size="${item.size}">
                        <i class="bi bi-trash" style="font-size: 1.3rem; color: black;"></i>
                    </button>
                </div>
                <div class="d-flex justify-content-between align-items-center mt-2">
                    <div>
                        <button class="qty-btn" data-id="${item.id}" data-size="${item.size}" data-action="decrease" style="border:1px solid #ccc; background:none; padding:2px 8px;">−</button>
                        <span class="mx-2">${item.quantity}</span>
                        <button class="qty-btn" data-id="${item.id}" data-size="${item.size}" data-action="increase" style="border:1px solid #ccc; background:none; padding:2px 8px;">+</button>
                    </div>
                    <strong>$${(item.price * item.quantity).toFixed(2)}</strong>
                </div>
            </div>
        `;
        drawer.appendChild(div);
        total += item.price * item.quantity;
    });

    drawerCount.textContent = cart.reduce((sum, item) => sum + item.quantity, 0);
    drawerTotal.textContent = total.toFixed(2);

    document.querySelectorAll('.remove-btn').forEach(button => {
        button.addEventListener('click', () => {
            const id = parseInt(button.getAttribute('data-id'));
            const size = button.getAttribute('data-size');
            removeItemFromCart(id, size);
        });
    });

    document.querySelectorAll('.qty-btn').forEach(button => {
        const action = button.getAttribute('data-action');
        const id = parseInt(button.getAttribute('data-id'));
        const size = button.getAttribute('data-size');
        button.addEventListener('click', () => {
            updateItemQuantity(id, size, action);
        });
    });
}

function fetchProducts() {
    fetch('/api/products')
        .then(response => {
            if (!response.ok) throw new Error('Network response was not ok');
            return response.json();
        })
        .then(products => {
            const productListDiv = document.getElementById('product-list');
            if (!productListDiv) return;

            productListDiv.innerHTML = '';

            products.forEach(product => {
                const {
                    id,
                    name = 'Unnamed Product',
                    price = 0,
                    image_url = 'https://via.placeholder.com/200x200?text=No+Image'
                } = product;

                const productCard = document.createElement('div');
                productCard.className = 'col-6 col-md-4 col-lg-3 mb-4 product-card';

                productCard.innerHTML = `
                    <div class="card border-0 shadow-sm h-100">
                        <a href="product-detail.html?id=${id}" class="product-image-link">
                            <img src="${image_url}" alt="${name}" class="product-image card-img-top" onerror="this.src='https://via.placeholder.com/200x200?text=No+Image';">
                        </a>
                        <div class="card-body text-center">
                            <h5 class="card-title mb-1">${name}</h5>
                            <p class="font-weight-bold mb-2">$${parseFloat(price).toFixed(2)}</p>
                            <button class="btn btn-sm btn-outline-dark add-to-cart-btn"
                                onclick="addItemToCart(${id}, '${name.replace(/'/g, "\\'")}', ${price}, '', '${image_url}')">
                                Add to Cart
                            </button>
                        </div>
                    </div>
                `;

                productListDiv.appendChild(productCard);
            });
        })
        .catch(error => {
            console.error('Error fetching products:', error);
            const productListDiv = document.getElementById('product-list');
            if (productListDiv) {
                productListDiv.innerHTML = `<div class="col-12 text-center text-danger">Failed to load products. Please try again later.</div>`;
            }
        });
}

function setupCartDrawerEvents() {
    const drawer = document.getElementById('cart-drawer');

    document.querySelectorAll('.nav-link[href="cart.html"]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            if (drawer) {
                drawer.classList.add('open');
                renderDrawerCart();
            }
        });
    });

    const closeBtn = document.querySelector('.close-cart');
    if (closeBtn && drawer) {
        closeBtn.addEventListener('click', () => drawer.classList.remove('open'));
    }

    const continueBtn = document.querySelector('.continue-shopping');
    if (continueBtn && drawer) {
        continueBtn.addEventListener('click', () => drawer.classList.remove('open'));
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && drawer?.classList.contains('open')) {
            drawer.classList.remove('open');
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    updateCartDisplay();
    setupCartDrawerEvents();

    const heroBtn = document.getElementById('hero-shop-now-btn');
    if (heroBtn) {
        heroBtn.addEventListener('click', () => {
            window.location.href = 'products.html';
        });
    }

    if (document.getElementById('product-list')) {
        fetchProducts();
    }
});

const checkoutBtn = document.querySelector('#cart-drawer .btn-block.btn-dark.mb-2');
if (checkoutBtn) {
    checkoutBtn.addEventListener('click', () => {
        window.location.href = 'checkout.html';
    });
}


// seacrch bar
document.addEventListener('DOMContentLoaded', () => {
    // Function to handle the search
    function handleGlobalSearch() {
        const searchInput = document.getElementById('globalSearchInput');
        const searchForm = document.getElementById('globalSearchForm');

        if (searchForm) {
            searchForm.addEventListener('submit', (event) => {
                event.preventDefault();
                const query = searchInput.value.toLowerCase().trim();
                if (query) {
                    window.location.href = `products.html?search=${encodeURIComponent(query)}`;
                } else {
                    window.location.href = 'products.html'; // Go to products page if search is empty
                }
            });
        }
    }

    // Call the function to set up the search functionality
    handleGlobalSearch();

    // Any other global scripts you might have can go here
});

// You might need to adapt other functions in this script
// depending on how they interact with the product display on products.html
// For example, if you have functions here that directly manipulate
// the product list, you might need to move or adjust them to products.html