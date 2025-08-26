/**
 * GrindCTRL - Premium Streetwear E-commerce
 * Flagship-level vanilla JavaScript implementation
 * Features: Multi-product catalog, cart, wishlist, checkout, animations
 */

'use strict';

// ===== GLOBAL STATE MANAGEMENT ===== 
class AppState {
    constructor() {
        this.products = [];
        this.categories = [];
        this.cart = this.loadFromStorage('grindctrl_cart') || [];
        this.wishlist = this.loadFromStorage('grindctrl_wishlist') || [];
        this.currentFilter = 'all';
        this.currentProduct = null;
        this.isLoading = false;
        this.modals = {
            quickView: false,
            checkout: false,
            sizeGuide: false,
            success: false
        };
        this.checkoutStep = 1;
        this.orderData = null;
    }

    // Persistent storage methods
    saveToStorage(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (error) {
            console.warn('Failed to save to localStorage:', error);
        }
    }

    loadFromStorage(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.warn('Failed to load from localStorage:', error);
            return null;
        }
    }

    // Cart methods
    addToCart(productId, options = {}) {
        const product = this.products.find(p => p.id === productId);
        if (!product) return false;

        const cartItem = {
            id: `${productId}_${options.size || 'default'}_${options.color || 'default'}`,
            productId,
            name: product.name,
            price: product.price,
            image: product.images[0],
            quantity: options.quantity || 1,
            size: options.size,
            color: options.color
        };

        const existingIndex = this.cart.findIndex(item => item.id === cartItem.id);
        
        if (existingIndex >= 0) {
            this.cart[existingIndex].quantity += cartItem.quantity;
        } else {
            this.cart.push(cartItem);
        }

        this.saveToStorage('grindctrl_cart', this.cart);
        this.updateCartUI();
        return true;
    }

    removeFromCart(itemId) {
        this.cart = this.cart.filter(item => item.id !== itemId);
        this.saveToStorage('grindctrl_cart', this.cart);
        this.updateCartUI();
    }

    updateCartQuantity(itemId, quantity) {
        if (quantity <= 0) {
            this.removeFromCart(itemId);
            return;
        }

        const item = this.cart.find(item => item.id === itemId);
        if (item) {
            item.quantity = quantity;
            this.saveToStorage('grindctrl_cart', this.cart);
            this.updateCartUI();
        }
    }

    clearCart() {
        this.cart = [];
        this.saveToStorage('grindctrl_cart', this.cart);
        this.updateCartUI();
    }

    getCartTotal() {
        return this.cart.reduce((total, item) => total + (item.price * item.quantity), 0);
    }

    getCartCount() {
        return this.cart.reduce((count, item) => count + item.quantity, 0);
    }

    // Wishlist methods
    toggleWishlist(productId) {
        const index = this.wishlist.indexOf(productId);
        if (index >= 0) {
            this.wishlist.splice(index, 1);
        } else {
            this.wishlist.push(productId);
        }
        this.saveToStorage('grindctrl_wishlist', this.wishlist);
        this.updateWishlistUI();
        return index < 0; // Return true if added, false if removed
    }

    isInWishlist(productId) {
        return this.wishlist.includes(productId);
    }

    // UI update methods
    updateCartUI() {
        const cartCount = this.getCartCount();
        const cartCountElement = document.getElementById('cartCount');
        
        if (cartCountElement) {
            cartCountElement.textContent = cartCount;
            cartCountElement.classList.toggle('visible', cartCount > 0);
        }

        this.renderCartItems();
    }

    updateWishlistUI() {
        const wishlistCountElement = document.getElementById('wishlistCount');
        
        if (wishlistCountElement) {
            wishlistCountElement.textContent = this.wishlist.length;
            wishlistCountElement.classList.toggle('visible', this.wishlist.length > 0);
        }

        this.renderWishlistItems();
    }

    renderCartItems() {
        const cartItemsContainer = document.getElementById('cartItems');
        const cartSummaryContainer = document.getElementById('cartSummary');
        
        if (!cartItemsContainer) return;

        if (this.cart.length === 0) {
            cartItemsContainer.innerHTML = `
                <div class="empty-cart">
                    <i class="fas fa-shopping-cart"></i>
                    <p>Your cart is empty</p>
                    <small>Add some items to get started</small>
                </div>
            `;
            cartSummaryContainer.innerHTML = '';
            return;
        }

        cartItemsContainer.innerHTML = this.cart.map(item => `
            <div class="cart-item" data-item-id="${item.id}">
                <img src="${item.image}" alt="${item.name}" class="cart-item-image" loading="lazy">
                <div class="cart-item-details">
                    <div class="cart-item-name">${item.name}</div>
                    <div class="cart-item-options">
                        ${item.size ? `Size: ${item.size}` : ''}
                        ${item.size && item.color ? ', ' : ''}
                        ${item.color ? `Color: ${item.color}` : ''}
                    </div>
                    <div class="cart-item-controls">
                        <div class="quantity-controls">
                            <!-- Use changeCartQuantity to always compute the new quantity based on current state -->
                            <button class="quantity-btn" onclick="app.changeCartQuantity('${item.id}', -1)">-</button>
                            <span class="quantity">${item.quantity}</span>
                            <button class="quantity-btn" onclick="app.changeCartQuantity('${item.id}', 1)">+</button>
                        </div>
                        <div class="cart-item-price">${(item.price * item.quantity).toFixed(2)} EGP</div>
                    </div>
                </div>
            </div>
        `).join('');

        const subtotal = this.getCartTotal();
        const shipping = 0; // Free shipping
        const total = subtotal + shipping;

        cartSummaryContainer.innerHTML = `
            <div class="summary-row">
                <span>Subtotal:</span>
                <span>${subtotal.toFixed(2)} EGP</span>
            </div>
            <div class="summary-row">
                <span>Shipping:</span>
                <span class="text-green">Free</span>
            </div>
            <div class="summary-row total">
                <span>Total:</span>
                <span>${total.toFixed(2)} EGP</span>
            </div>
            <button class="btn btn-primary checkout-btn" onclick="app.openCheckout()">
                Proceed to Checkout
            </button>
        `;
    }

    renderWishlistItems() {
        const wishlistItemsContainer = document.getElementById('wishlistItems');
        
        if (!wishlistItemsContainer) return;

        if (this.wishlist.length === 0) {
            wishlistItemsContainer.innerHTML = `
                <div class="empty-wishlist">
                    <i class="fas fa-heart"></i>
                    <p>Your wishlist is empty</p>
                    <small>Save items you love for later</small>
                </div>
            `;
            return;
        }

        const wishlistProducts = this.wishlist.map(id => this.products.find(p => p.id === id)).filter(Boolean);

        wishlistItemsContainer.innerHTML = wishlistProducts.map(product => `
            <div class="wishlist-item" data-product-id="${product.id}">
                <img src="${product.images[0]}" alt="${product.name}" class="wishlist-item-image" loading="lazy">
                <div class="wishlist-item-details">
                    <div class="wishlist-item-name">${product.name}</div>
                    <div class="wishlist-item-price">${product.price.toFixed(2)} EGP</div>
                    <div class="wishlist-item-actions">
                        <button class="wishlist-btn primary" onclick="app.openQuickView('${product.id}')">
                            Quick View
                        </button>
                        <button class="wishlist-btn secondary" onclick="app.toggleWishlist('${product.id}')">
                            Remove
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }
}

// ===== UTILITY FUNCTIONS =====
class Utils {
    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    static throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    static fadeIn(element, duration = 300) {
        element.style.opacity = '0';
        element.style.display = 'block';
        
        let start = performance.now();
        
        function animate(timestamp) {
            let progress = (timestamp - start) / duration;
            if (progress > 1) progress = 1;
            
            element.style.opacity = progress;
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        }
        
        requestAnimationFrame(animate);
    }

    static fadeOut(element, duration = 300) {
        let start = performance.now();
        let startOpacity = parseFloat(getComputedStyle(element).opacity);
        
        function animate(timestamp) {
            let progress = (timestamp - start) / duration;
            if (progress > 1) progress = 1;
            
            element.style.opacity = startOpacity * (1 - progress);
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                element.style.display = 'none';
            }
        }
        
        requestAnimationFrame(animate);
    }

    static scrollToElement(element, offset = 0) {
        const elementPosition = element.offsetTop - offset;
        window.scrollTo({
            top: elementPosition,
            behavior: 'smooth'
        });
    }

    static formatPrice(price, currency = 'EGP') {
        return `${price.toFixed(2)} ${currency}`;
    }

    static validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    static validatePhone(phone) {
        const re = /^[\+]?[\d\s\-\(\)]{8,}$/;
        return re.test(phone);
    }

    static generateOrderId() {
        const timestamp = Date.now().toString(36);
        const randomStr = Math.random().toString(36).substring(2, 8);
        return `GC-${timestamp}-${randomStr}`.toUpperCase();
    }

    static generateTrackingNumber() {
        const prefix = 'TRK';
        const randomNum = Math.floor(Math.random() * 1000000000);
        return `${prefix}${randomNum.toString().padStart(9, '0')}`;
    }
}

// ===== NOTIFICATION SYSTEM =====
class NotificationManager {
    constructor() {
        this.notifications = [];
        this.container = document.getElementById('notificationToast');
        // Track the timeout for the current toast. When a new notification is shown
        // any existing timeout is cleared to ensure predictable auto‑hide behaviour.
        this.currentTimeout = null;
    }

    show(message, type = 'info', duration = 4000) {
        if (!this.container) return;

        const notification = {
            id: Date.now(),
            message,
            type,
            duration
        };

        // Add to stack and render the latest message. Because only one toast is visible at
        // a time, we overwrite the existing content but retain a record of notifications.
        this.notifications.push(notification);
        this.render(notification);

        // If a toast is already scheduled to hide, cancel it so that the duration is
        // relative to the most recent notification.
        if (this.currentTimeout) {
            clearTimeout(this.currentTimeout);
            this.currentTimeout = null;
        }

        // Schedule hiding of this toast after the specified duration.  Store the timeout
        // identifier so it can be cancelled if another toast appears before it fires.
        this.currentTimeout = setTimeout(() => {
            this.hide(notification.id);
            this.currentTimeout = null;
        }, duration);
    }

    render(notification) {
        const iconMap = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            info: 'fas fa-info-circle',
            warning: 'fas fa-exclamation-triangle'
        };

        this.container.querySelector('.toast-icon').className = `toast-icon ${notification.type} ${iconMap[notification.type]}`;
        this.container.querySelector('.toast-message').textContent = notification.message;
        
        this.container.classList.add('show');

        // Auto-hide on close button click
        const closeBtn = this.container.querySelector('.toast-close');
        if (closeBtn) {
            closeBtn.onclick = () => this.hide(notification.id);
        }
    }

    hide(id) {
        this.notifications = this.notifications.filter(n => n.id !== id);
        this.container.classList.remove('show');
    }

    success(message) {
        this.show(message, 'success');
    }

    error(message) {
        this.show(message, 'error');
    }

    info(message) {
        this.show(message, 'info');
    }

    warning(message) {
        this.show(message, 'warning');
    }
}

// ===== LOADING MANAGER =====
class LoadingManager {
    constructor() {
        this.loadingScreen = document.getElementById('loadingScreen');
        this.loadingTasks = new Set();
    }

    show(taskId = 'default') {
        this.loadingTasks.add(taskId);
        if (this.loadingScreen) {
            this.loadingScreen.classList.remove('hidden');
        }
    }

    hide(taskId = 'default') {
        this.loadingTasks.delete(taskId);
        if (this.loadingTasks.size === 0 && this.loadingScreen) {
            this.loadingScreen.classList.add('hidden');
        }
    }

    hideAll() {
        this.loadingTasks.clear();
        if (this.loadingScreen) {
            this.loadingScreen.classList.add('hidden');
        }
    }
}

// ===== SCROLL ANIMATIONS =====
class ScrollAnimations {
    constructor() {
        this.observer = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('visible');
                    }
                });
            },
            { 
                threshold: 0.1,
                rootMargin: '0px 0px -50px 0px'
            }
        );

        this.init();
    }

    init() {
        // Add animation classes to elements
        const animateElements = document.querySelectorAll('.product-card, .feature, .about-text, .hero-stats .stat');
        
        animateElements.forEach((el, index) => {
            el.classList.add('fade-in');
            el.style.transitionDelay = `${index * 0.1}s`;
            this.observer.observe(el);
        });
    }
}

// ===== MAIN APPLICATION CLASS =====
class GrindCTRLApp {
    constructor() {
        this.state = new AppState();
        this.notifications = new NotificationManager();
        this.loading = new LoadingManager();
        this.scrollAnimations = null;
        
        this.init();
    }

    async init() {
        /**
         * The initialization routine sets up the application state, fetches
         * products, attaches event listeners, and triggers the first render.
         * Regardless of success or failure, the loading screen should be
         * dismissed so the user isn't stuck watching the spinner forever.
         */
        try {
            this.loading.show('init');

            // Load product data.  If this fails, loadProducts() will fall
            // back to embedded data.  Any error thrown beyond that will be
            // caught below.
            await this.loadProducts();

            // Initialize UI components
            this.initializeEventListeners();
            this.initializeNavigation();
            this.initializeModals();
            this.initializeBackToTop();
            this.initializeNewsletterForm();
            this.initializeContactForm();

            // Initialize return/exchange form handlers so customers can request
            // returns or exchanges from the footer at any time.
            this.initializeReturnExchangeForms();

            // Render initial content
            this.renderCategories();
            this.renderProducts();
            this.state.updateCartUI();
            this.state.updateWishlistUI();

            // Initialize scroll animations
            setTimeout(() => {
                this.scrollAnimations = new ScrollAnimations();
            }, 100);

            console.log('GrindCTRL App initialized successfully');

        } catch (error) {
            console.error('Failed to initialize app:', error);
            this.notifications.error('Failed to load the application. Please refresh the page.');
            // In case of a critical failure, hide all loading tasks
            this.loading.hideAll();
        } finally {
            // Always hide the loading screen after initialization attempt
            this.loading.hide('init');
        }
    }

    async loadProducts() {
        try {
            const response = await fetch('./products.json');
            if (!response.ok) throw new Error('Failed to fetch products');
            
            const data = await response.json();
            this.state.products = data.products;
            this.state.categories = data.categories;
            
        } catch (error) {
            console.error('Error loading products:', error);
            // Fallback to embedded data
            this.loadFallbackData();
        }
    }

    loadFallbackData() {
        // Fallback product data in case JSON file fails to load
        this.state.products = [
            {
                id: "luxury-cropped-black-tee",
                name: "Luxury Cropped Black T-Shirt",
                description: "Premium cotton blend with perfect fit. Minimalist design meets maximum impact.",
                price: 300.00,
                originalPrice: 350.00,
                category: "tshirts",
                featured: true,
                images: [
                    "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=800"
                ],
                colors: [
                    { name: "Black", value: "#000000" },
                    { name: "White", value: "#FFFFFF" },
                    { name: "Gray", value: "#6B7280" }
                ],
                sizes: ["XS", "S", "M", "L", "XL", "XXL"],
                inStock: true,
                rating: 4.9,
                reviewCount: 127,
                tags: ["HOT", "BESTSELLER"]
            }
        ];
        
        this.state.categories = [
            { id: "all", name: "All Products", filter: null },
            { id: "tshirts", name: "T-Shirts", filter: "tshirts" }
        ];
    }

    initializeEventListeners() {
        // Cart toggle
        const cartToggle = document.getElementById('cartToggle');
        if (cartToggle) {
            cartToggle.addEventListener('click', () => this.toggleCart());
        }

        // Wishlist toggle  
        const wishlistToggle = document.getElementById('wishlistToggle');
        if (wishlistToggle) {
            wishlistToggle.addEventListener('click', () => this.toggleWishlist());
        }

        // Mobile menu
        const mobileMenuToggle = document.getElementById('mobileMenuToggle');
        if (mobileMenuToggle) {
            mobileMenuToggle.addEventListener('click', () => this.toggleMobileMenu());
        }

        // Close buttons
        document.addEventListener('click', (e) => {
            if (e.target.matches('.cart-close')) {
                this.toggleCart(false);
            }
            if (e.target.matches('.wishlist-close')) {
                this.toggleWishlist(false);
            }
            if (e.target.matches('.modal-close')) {
                this.closeAllModals();
            }
        });

        // Escape key to close modals
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAllModals();
                this.toggleCart(false);
                this.toggleWishlist(false);
            }
        });

        // Window resize
        window.addEventListener('resize', Utils.debounce(() => {
            this.handleResize();
        }, 250));

        // Window scroll
        window.addEventListener('scroll', Utils.throttle(() => {
            this.handleScroll();
        }, 16));
    }

    initializeNavigation() {
        const navLinks = document.querySelectorAll('.nav-link');
        
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = link.getAttribute('data-section');
                if (section) {
                    this.scrollToSection(section);
                    this.setActiveNavLink(link);
                }
                // Close the mobile menu if it is open when navigating to a section
                const nav = document.querySelector('.nav');
                if (nav && nav.classList.contains('open')) {
                    nav.classList.remove('open');
                }
                // Close any open Orders dropdown when clicking on a regular nav link
                const openDropdown = document.querySelector('.nav-dropdown.open');
                if (openDropdown && !link.closest('.nav-dropdown')) {
                    openDropdown.classList.remove('open');
                }
            });
        });

        // Enable click‑to‑toggle behaviour for the Orders dropdown.  On
        // touchscreen devices there is no hover event, so we toggle an
        // `.open` class via JavaScript and hide the dropdown when clicking
        // elsewhere on the page.
        const ordersDropdown = document.querySelector('.nav-dropdown');
        if (ordersDropdown) {
            const ordersLink = ordersDropdown.querySelector('a.nav-link');
            if (ordersLink) {
                ordersLink.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    ordersDropdown.classList.toggle('open');
                });
            }
            document.addEventListener('click', (e) => {
                if (!ordersDropdown.contains(e.target)) {
                    ordersDropdown.classList.remove('open');
                }
            });
        }

        // Update active nav on scroll
        this.updateActiveNavOnScroll();
    }

    initializeModals() {
        // Click outside to close modals
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeAllModals();
            }
        });
    }

    initializeBackToTop() {
        const backToTopBtn = document.getElementById('backToTop');
        if (backToTopBtn) {
            backToTopBtn.addEventListener('click', () => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
        }
    }

    initializeNewsletterForm() {
        const form = document.getElementById('newsletterForm');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const email = form.querySelector('input[type="email"]').value;
                
                if (Utils.validateEmail(email)) {
                    this.notifications.success('Thank you for subscribing to our newsletter!');
                    form.reset();
                } else {
                    this.notifications.error('Please enter a valid email address.');
                }
            });
        }
    }

    /**
     * Initialize the contact form submission handler.  When the user
     * submits the form, we display a success toast and reset the fields.
     * No network request is made in this static implementation, but
     * this provides immediate feedback for the user.
     */
    initializeContactForm() {
        const form = document.getElementById('contactForm');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const name = form.querySelector('input[name="name"]').value.trim();
                const email = form.querySelector('input[name="email"]').value.trim();
                const message = form.querySelector('textarea[name="message"]').value.trim();
                // Basic validation
                if (!name) {
                    this.notifications.error('Please enter your name.');
                    return;
                }
                if (!Utils.validateEmail(email)) {
                    this.notifications.error('Please enter a valid email address.');
                    return;
                }
                if (!message) {
                    this.notifications.error('Please enter a message.');
                    return;
                }
                // In a real implementation you would send this data to a backend
                this.notifications.success('Thank you for reaching out! We will get back to you soon.');
                form.reset();
            });
        }
    }

    renderCategories() {
        const categoryTabs = document.getElementById('categoryTabs');
        if (!categoryTabs) return;

        categoryTabs.innerHTML = this.state.categories.map(category => `
            <button class="filter-tab ${category.id === this.state.currentFilter ? 'active' : ''}" 
                    data-category="${category.id}"
                    onclick="app.filterProducts('${category.id}')">
                ${category.name}
            </button>
        `).join('');
    }

    renderProducts() {
        const productsGrid = document.getElementById('productsGrid');
        if (!productsGrid) return;

        let filteredProducts = this.state.products;
        
        if (this.state.currentFilter !== 'all') {
            filteredProducts = this.state.products.filter(product => 
                product.category === this.state.currentFilter
            );
        }

        if (filteredProducts.length === 0) {
            productsGrid.innerHTML = `
                <div class="no-products">
                    <i class="fas fa-search"></i>
                    <h3>No products found</h3>
                    <p>Try a different category or check back later.</p>
                </div>
            `;
            return;
        }

        productsGrid.innerHTML = filteredProducts.map(product => this.createProductCard(product)).join('');
    }

    createProductCard(product) {
        const discount = product.originalPrice ? 
            Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100) : 0;

        return `
            <div class="product-card fade-in" data-product-id="${product.id}">
                <div class="product-image-container">
                    <img src="${product.images[0]}" 
                         alt="${product.name}" 
                         class="product-image" 
                         loading="lazy">
                    
                    <div class="product-actions">
                        <button class="action-btn ${this.state.isInWishlist(product.id) ? 'active' : ''}" 
                                onclick="app.toggleWishlistItem('${product.id}')"
                                title="Add to Wishlist">
                            <i class="fas fa-heart"></i>
                        </button>
                        <button class="action-btn" 
                                onclick="app.openQuickView('${product.id}')"
                                title="Quick View">
                            <i class="fas fa-eye"></i>
                        </button>
                    </div>
                    
                    ${product.tags && product.tags.length > 0 ? `
                        <div class="product-tags">
                            ${product.tags.map(tag => `
                                <span class="product-tag ${tag.toLowerCase()}">${tag}</span>
                            `).join('')}
                        </div>
                    ` : ''}
                    
                    ${discount > 0 ? `
                        <div class="product-tags" style="top: ${(product.tags?.length || 0) * 35 + 16}px;">
                            <span class="product-tag sale">${discount}% OFF</span>
                        </div>
                    ` : ''}
                    
                    <div class="quick-view-overlay">
                        <button class="quick-view-btn" onclick="app.openQuickView('${product.id}')">
                            Quick View
                        </button>
                    </div>
                </div>
                
                <div class="product-info">
                    <h3 class="product-name">${product.name}</h3>
                    <p class="product-description">${product.description}</p>
                    
                    ${product.colors && product.colors.length > 0 ? `
                        <div class="product-colors">
                            ${product.colors.slice(0, 3).map(color => `
                                <div class="color-option" 
                                     style="background-color: ${color.value}"
                                     title="${color.name}"></div>
                            `).join('')}
                            ${product.colors.length > 3 ? `<span class="color-more">+${product.colors.length - 3}</span>` : ''}
                        </div>
                    ` : ''}
                    
                    <div class="product-price-rating">
                        <div class="product-price">
                            <span class="price-current">${Utils.formatPrice(product.price)}</span>
                            ${product.originalPrice ? `
                                <span class="price-original">${Utils.formatPrice(product.originalPrice)}</span>
                                <span class="price-discount">${discount}% OFF</span>
                            ` : ''}
                        </div>
                        
                        <div class="product-rating">
                            <div class="stars">
                                ${this.generateStars(product.rating)}
                            </div>
                            <span class="rating-count">(${product.reviewCount})</span>
                        </div>
                    </div>
                    
                    <button class="add-to-cart-btn" 
                            onclick="app.addToCartQuick('${product.id}')"
                            ${!product.inStock ? 'disabled' : ''}>
                        <span class="btn-text">
                            ${product.inStock ? 'Add to Cart' : 'Out of Stock'}
                        </span>
                        <div class="loading-spinner"></div>
                    </button>
                </div>
            </div>
        `;
    }

    generateStars(rating) {
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 !== 0;
        const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
        
        let starsHtml = '';
        
        for (let i = 0; i < fullStars; i++) {
            starsHtml += '<i class="fas fa-star"></i>';
        }
        
        if (hasHalfStar) {
            starsHtml += '<i class="fas fa-star-half-alt"></i>';
        }
        
        for (let i = 0; i < emptyStars; i++) {
            starsHtml += '<i class="far fa-star"></i>';
        }
        
        return starsHtml;
    }

    // ===== INTERACTION METHODS =====
    filterProducts(categoryId) {
        this.state.currentFilter = categoryId;
        this.renderCategories();
        this.renderProducts();
        
        // Animate products
        const productCards = document.querySelectorAll('.product-card');
        productCards.forEach((card, index) => {
            card.style.animationDelay = `${index * 0.1}s`;
            card.classList.add('fade-in');
        });

        // After filtering, scroll to the collection section so the grid is visible.
        const collectionSection = document.getElementById('collection');
        if (collectionSection) {
            Utils.scrollToElement(collectionSection, 80);
        }
    }

    addToCartQuick(productId) {
        const product = this.state.products.find(p => p.id === productId);
        if (!product) return;

        // For quick add, use first available options
        const options = {
            quantity: 1,
            size: product.sizes && product.sizes.length > 0 ? product.sizes[0] : null,
            color: product.colors && product.colors.length > 0 ? product.colors[0].name : null
        };

        if (this.state.addToCart(productId, options)) {
            this.notifications.success(`${product.name} added to cart!`);
            
            // Animate the cart icon
            const cartIcon = document.getElementById('cartToggle');
            if (cartIcon) {
                cartIcon.style.transform = 'scale(1.2)';
                setTimeout(() => {
                    cartIcon.style.transform = 'scale(1)';
                }, 200);
            }
        } else {
            this.notifications.error('Failed to add item to cart');
        }
    }

    toggleWishlistItem(productId) {
        const added = this.state.toggleWishlist(productId);
        const product = this.state.products.find(p => p.id === productId);
        
        if (product) {
            if (added) {
                this.notifications.success(`${product.name} added to wishlist!`);
            } else {
                this.notifications.info(`${product.name} removed from wishlist`);
            }
        }

        // Update wishlist button state
        const wishlistBtns = document.querySelectorAll(`[data-product-id="${productId}"] .action-btn`);
        wishlistBtns.forEach(btn => {
            if (btn.querySelector('.fa-heart')) {
                btn.classList.toggle('active', added);
            }
        });
    }

    /**
     * Forward cart quantity updates to the AppState.  Without this wrapper,
     * the inline handlers in the cart attempted to call a nonexistent
     * `updateCartQuantity` method on the GrindCTRLApp instance, resulting in
     * no change when clicking the plus/minus buttons.  This wrapper
     * delegates the call to AppState and ensures the cart re-renders.
     * @param {string} itemId The unique cart item id
     * @param {number} quantity The quantity to set
     */
    updateCartQuantity(itemId, quantity) {
        this.state.updateCartQuantity(itemId, quantity);
    }

    /**
     * Adjust a cart item's quantity relative to its current value.  This
     * convenience method reads the latest quantity from the state and
     * computes the new value, avoiding stale numbers baked into the
     * generated HTML.  Use a positive delta to increment and negative
     * to decrement.  If the result is zero or less, the item will be
     * removed.
     * @param {string} itemId The unique cart item id
     * @param {number} delta The increment/decrement amount
     */
    changeCartQuantity(itemId, delta) {
        const item = this.state.cart.find(item => item.id === itemId);
        if (!item) return;
        const newQuantity = item.quantity + delta;
        this.state.updateCartQuantity(itemId, newQuantity);
    }

    openQuickView(productId) {
        const product = this.state.products.find(p => p.id === productId);
        if (!product) return;

        this.state.currentProduct = product;
        this.renderQuickView(product);
        this.openModal('quickView');
    }

    renderQuickView(product) {
        const quickViewBody = document.getElementById('quickViewBody');
        if (!quickViewBody) return;

        const discount = product.originalPrice ? 
            Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100) : 0;

        quickViewBody.innerHTML = `
            <div class="quick-view-content">
                <div class="quick-view-images">
                    <img src="${product.images[0]}" 
                         alt="${product.name}" 
                         class="quick-view-main-image" 
                         id="quickViewMainImage">
                    
                    ${product.images.length > 1 ? `
                        <div class="quick-view-thumbnails">
                            ${product.images.map((image, index) => `
                                <img src="${image}" 
                                     alt="${product.name} view ${index + 1}" 
                                     class="thumbnail ${index === 0 ? 'active' : ''}"
                                     onclick="app.changeQuickViewImage('${image}', this)">
                            `).join('')}
                        </div>
                    ` : ''}
                </div>
                
                <div class="quick-view-details">
                    <h3>${product.name}</h3>
                    
                    <div class="quick-view-rating">
                        <div class="stars">${this.generateStars(product.rating)}</div>
                        <span>(${product.reviewCount} reviews)</span>
                    </div>
                    
                    <div class="quick-view-price">
                        <span class="price-large">${Utils.formatPrice(product.price)}</span>
                        ${product.originalPrice ? `
                            <span class="price-original">${Utils.formatPrice(product.originalPrice)}</span>
                            <span class="price-discount">${discount}% OFF</span>
                        ` : ''}
                    </div>
                    
                    <p class="product-description">${product.description}</p>
                    
                    ${product.colors && product.colors.length > 0 ? `
                        <div class="options-section">
                            <h4>Color</h4>
                            <div class="color-options">
                                ${product.colors.map((color, index) => `
                                    <div class="color-option-large ${index === 0 ? 'selected' : ''}" 
                                         style="background-color: ${color.value}"
                                         data-color="${color.name}"
                                         onclick="app.selectQuickViewColor(this)"
                                         title="${color.name}"></div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                    
                    ${product.sizes && product.sizes.length > 1 ? `
                        <div class="options-section">
                            <h4>Size <button class="size-guide-link" onclick="app.openSizeGuide()">Size Guide</button></h4>
                            <div class="size-options">
                                ${product.sizes.map((size, index) => `
                                    <button class="size-option ${index === 0 ? 'selected' : ''}"
                                            data-size="${size}"
                                            onclick="app.selectQuickViewSize(this)">
                                        ${size}
                                    </button>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                    
                    <div class="quantity-section">
                        <label>Quantity</label>
                        <div class="quantity-selector">
                            <button onclick="app.updateQuickViewQuantity(-1)">-</button>
                            <input type="number" id="quickViewQuantity" value="1" min="1" max="10" readonly>
                            <button onclick="app.updateQuickViewQuantity(1)">+</button>
                        </div>
                    </div>
                    
                    <div class="action-buttons">
                        <button class="btn btn-primary" onclick="app.addToCartFromQuickView()" style="flex: 1;">
                            Add to Cart
                        </button>
                        <button class="wishlist-toggle ${this.state.isInWishlist(product.id) ? 'active' : ''}" 
                                onclick="app.toggleWishlistItem('${product.id}')">
                            <i class="fas fa-heart"></i>
                        </button>
                    </div>
                    
                    <div class="product-features">
                        <div class="feature-item">
                            <i class="fas fa-shipping-fast"></i>
                            <span>Free shipping worldwide</span>
                        </div>
                        <div class="feature-item">
                            <i class="fas fa-undo"></i>
                            <span>30-day return policy</span>
                        </div>
                        <div class="feature-item">
                            <i class="fas fa-certificate"></i>
                            <span>Premium quality guarantee</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    changeQuickViewImage(imageSrc, thumbnail) {
        const mainImage = document.getElementById('quickViewMainImage');
        if (mainImage) {
            mainImage.src = imageSrc;
        }

        // Update thumbnail active state
        document.querySelectorAll('.thumbnail').forEach(thumb => thumb.classList.remove('active'));
        thumbnail.classList.add('active');
    }

    selectQuickViewColor(colorElement) {
        document.querySelectorAll('.color-option-large').forEach(el => el.classList.remove('selected'));
        colorElement.classList.add('selected');
    }

    selectQuickViewSize(sizeElement) {
        document.querySelectorAll('.size-option').forEach(el => el.classList.remove('selected'));
        sizeElement.classList.add('selected');
    }

    updateQuickViewQuantity(change) {
        const quantityInput = document.getElementById('quickViewQuantity');
        if (!quantityInput) return;

        let currentValue = parseInt(quantityInput.value) || 1;
        let newValue = currentValue + change;
        
        if (newValue < 1) newValue = 1;
        if (newValue > 10) newValue = 10;
        
        quantityInput.value = newValue;
    }

    addToCartFromQuickView() {
        if (!this.state.currentProduct) return;

        const selectedColor = document.querySelector('.color-option-large.selected')?.getAttribute('data-color');
        const selectedSize = document.querySelector('.size-option.selected')?.getAttribute('data-size');
        const quantity = parseInt(document.getElementById('quickViewQuantity')?.value) || 1;

        const options = {
            quantity,
            size: selectedSize,
            color: selectedColor
        };

        if (this.state.addToCart(this.state.currentProduct.id, options)) {
            this.notifications.success(`${this.state.currentProduct.name} added to cart!`);
            this.closeModal('quickView');
        } else {
            this.notifications.error('Failed to add item to cart');
        }
    }

    openCheckout() {
        if (this.state.cart.length === 0) {
            this.notifications.warning('Your cart is empty');
            return;
        }

        this.state.checkoutStep = 1;
        this.renderCheckout();
        this.openModal('checkout');
    }

    renderCheckout() {
        const checkoutBody = document.getElementById('checkoutBody');
        if (!checkoutBody) return;

        // Update progress
        this.updateCheckoutProgress();

        if (this.state.checkoutStep === 1) {
            this.renderCheckoutStep1(checkoutBody);
        } else if (this.state.checkoutStep === 2) {
            this.renderCheckoutStep2(checkoutBody);
        } else if (this.state.checkoutStep === 3) {
            this.renderCheckoutStep3(checkoutBody);
        }
    }

    updateCheckoutProgress() {
        const progressSteps = document.querySelectorAll('.progress-step');
        progressSteps.forEach((step, index) => {
            const stepNumber = index + 1;
            step.classList.toggle('active', stepNumber === this.state.checkoutStep);
            step.classList.toggle('completed', stepNumber < this.state.checkoutStep);
        });
    }

    renderCheckoutStep1(container) {
        container.innerHTML = `
            <div class="checkout-content">
                <div class="checkout-form">
                    <form id="checkoutForm1">
                        <div class="form-section">
                            <h4>Shipping Information</h4>
                            
                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label">First Name *</label>
                                    <input type="text" name="firstName" class="form-input" required>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Last Name *</label>
                                    <input type="text" name="lastName" class="form-input" required>
                                </div>
                            </div>
                            
                            <div class="form-group">
                                <label class="form-label">Email Address *</label>
                                <input type="email" name="email" class="form-input" required>
                            </div>
                            
                            <div class="form-group">
                                <label class="form-label">Phone Number *</label>
                                <input type="tel" name="phone" class="form-input" required>
                            </div>
                            
                            <div class="form-group">
                                <label class="form-label">Shipping Address *</label>
                                <input type="text" name="address" class="form-input" placeholder="Street address" required>
                            </div>
                            
                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label">City *</label>
                                    <input type="text" name="city" class="form-input" required>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Postal Code *</label>
                                    <input type="text" name="postalCode" class="form-input" required>
                                </div>
                            </div>
                        </div>
                        
                        <button type="submit" class="btn btn-primary">Continue to Payment</button>
                    </form>
                </div>
                
                ${this.renderOrderSummary()}
            </div>
        `;

        // Add form submission handler
        const form = document.getElementById('checkoutForm1');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                if (this.validateCheckoutForm(form)) {
                    this.saveCheckoutData(form);
                    this.state.checkoutStep = 2;
                    this.renderCheckout();
                }
            });
        }
    }

    renderCheckoutStep2(container) {
        container.innerHTML = `
            <div class="checkout-content">
                <div class="checkout-form">
                    <form id="checkoutForm2">
                        <div class="form-section">
                            <h4>Payment Method</h4>
                            
                            <div class="payment-methods">
                                <div class="payment-method selected" data-method="cod">
                                    <div class="payment-radio"></div>
                                    <i class="payment-icon fas fa-money-bill-wave"></i>
                                    <div>
                                        <strong>Cash on Delivery</strong>
                                        <p>Pay when you receive your order</p>
                                    </div>
                                </div>
                                
                                <div class="payment-method" data-method="transfer">
                                    <div class="payment-radio"></div>
                                    <i class="payment-icon fas fa-university"></i>
                                    <div>
                                        <strong>Bank Transfer</strong>
                                        <p>Transfer to our bank account</p>
                                    </div>
                                </div>
                                
                                <div class="payment-method" data-method="card">
                                    <div class="payment-radio"></div>
                                    <i class="payment-icon fas fa-credit-card"></i>
                                    <div>
                                        <strong>Credit Card</strong>
                                        <p>Secure online payment</p>
                                    </div>
                                </div>
                            </div>
                            
                            <input type="hidden" name="paymentMethod" value="cod">
                        </div>
                        
                        <div class="form-actions">
                            <button type="button" class="btn btn-secondary" onclick="app.prevCheckoutStep()">
                                Back
                            </button>
                            <button type="submit" class="btn btn-primary">
                                Review Order
                            </button>
                        </div>
                    </form>
                </div>
                
                ${this.renderOrderSummary()}
            </div>
        `;

        // Add payment method selection
        const paymentMethods = document.querySelectorAll('.payment-method');
        paymentMethods.forEach(method => {
            method.addEventListener('click', () => {
                paymentMethods.forEach(m => m.classList.remove('selected'));
                method.classList.add('selected');
                
                const hiddenInput = document.querySelector('input[name="paymentMethod"]');
                if (hiddenInput) {
                    hiddenInput.value = method.getAttribute('data-method');
                }
            });
        });

        // Add form submission handler
        const form = document.getElementById('checkoutForm2');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveCheckoutData(form);
                this.state.checkoutStep = 3;
                this.renderCheckout();
            });
        }
    }

    renderCheckoutStep3(container) {
        container.innerHTML = `
            <div class="checkout-content">
                <div class="checkout-form">
                    <div class="form-section">
                        <h4>Review Your Order</h4>
                        <p>Please review your order details before placing your order.</p>
                        
                        <div class="order-review">
                            <div class="review-section">
                                <h5>Shipping Address</h5>
                                <p>
                                    ${this.state.orderData?.firstName} ${this.state.orderData?.lastName}<br>
                                    ${this.state.orderData?.address}<br>
                                    ${this.state.orderData?.city}, ${this.state.orderData?.postalCode}<br>
                                    ${this.state.orderData?.phone}
                                </p>
                            </div>
                            
                            <div class="review-section">
                                <h5>Payment Method</h5>
                                <p>${this.getPaymentMethodName(this.state.orderData?.paymentMethod)}</p>
                            </div>
                        </div>
                        
                        <div class="form-actions">
                            <button type="button" class="btn btn-secondary" onclick="app.prevCheckoutStep()">
                                Back
                            </button>
                            <button type="button" class="btn btn-primary" onclick="app.submitOrder()">
                                Place Order
                            </button>
                        </div>
                    </div>
                </div>
                
                ${this.renderOrderSummary()}
            </div>
        `;
    }

    renderOrderSummary() {
        const subtotal = this.state.getCartTotal();
        const shipping = 0;
        const tax = 0;
        const total = subtotal + shipping + tax;

        return `
            <div class="order-summary">
                <h4>Order Summary</h4>
                
                <div class="summary-items">
                    ${this.state.cart.map(item => `
                        <div class="summary-item">
                            <img src="${item.image}" alt="${item.name}" class="summary-item-image">
                            <div class="summary-item-details">
                                <div class="summary-item-name">${item.name}</div>
                                <div class="summary-item-options">
                                    ${item.size ? `Size: ${item.size}` : ''}
                                    ${item.size && item.color ? ', ' : ''}
                                    ${item.color ? `Color: ${item.color}` : ''}
                                    <br>Qty: ${item.quantity}
                                </div>
                                <div class="summary-item-price">${Utils.formatPrice(item.price * item.quantity)}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
                
                <div class="summary-totals">
                    <div class="summary-row">
                        <span>Subtotal:</span>
                        <span>${Utils.formatPrice(subtotal)}</span>
                    </div>
                    <div class="summary-row">
                        <span>Shipping:</span>
                        <span>Free</span>
                    </div>
                    <div class="summary-row">
                        <span>Tax:</span>
                        <span>${Utils.formatPrice(tax)}</span>
                    </div>
                    <div class="summary-row summary-total">
                        <span>Total:</span>
                        <span>${Utils.formatPrice(total)}</span>
                    </div>
                </div>
            </div>
        `;
    }

    validateCheckoutForm(form) {
        const formData = new FormData(form);
        let isValid = true;

        // Clear previous errors
        form.querySelectorAll('.form-error').forEach(error => error.remove());
        form.querySelectorAll('.form-input.error').forEach(input => input.classList.remove('error'));

        // Validate required fields
        form.querySelectorAll('[required]').forEach(input => {
            if (!input.value.trim()) {
                this.showFieldError(input, 'This field is required');
                isValid = false;
            }
        });

        // Validate email
        const emailInput = form.querySelector('input[type="email"]');
        if (emailInput && emailInput.value && !Utils.validateEmail(emailInput.value)) {
            this.showFieldError(emailInput, 'Please enter a valid email address');
            isValid = false;
        }

        // Validate phone
        const phoneInput = form.querySelector('input[type="tel"]');
        if (phoneInput && phoneInput.value && !Utils.validatePhone(phoneInput.value)) {
            this.showFieldError(phoneInput, 'Please enter a valid phone number');
            isValid = false;
        }

        return isValid;
    }

    showFieldError(input, message) {
        input.classList.add('error');
        
        const errorElement = document.createElement('div');
        errorElement.className = 'form-error';
        errorElement.textContent = message;
        
        input.parentNode.appendChild(errorElement);
    }

    saveCheckoutData(form) {
        const formData = new FormData(form);
        const data = {};
        
        for (let [key, value] of formData.entries()) {
            data[key] = value;
        }

        this.state.orderData = { ...this.state.orderData, ...data };
    }

    prevCheckoutStep() {
        if (this.state.checkoutStep > 1) {
            this.state.checkoutStep--;
            this.renderCheckout();
        }
    }

    getPaymentMethodName(method) {
        const methods = {
            cod: 'Cash on Delivery',
            transfer: 'Bank Transfer',
            card: 'Credit Card'
        };
        return methods[method] || method;
    }

    async submitOrder() {
        try {
            this.loading.show('order');

            // Prepare order data for webhook
            const orderData = this.prepareOrderData();

            // Send to webhook
            const success = await this.sendOrderToWebhook(orderData);

            if (success) {
                // Persist this order in localStorage so customers can look it up by phone
                this.storeOrder(orderData);
                this.showOrderSuccess(orderData);
                this.state.clearCart();
                this.closeModal('checkout');
            } else {
                throw new Error('Order processing failed');
            }

        } catch (error) {
            console.error('Order submission error:', error);
            this.notifications.error('Failed to place order. Please try again.');
        } finally {
            this.loading.hide('order');
        }
    }

    prepareOrderData() {
        const orderId = Utils.generateOrderId();
        const trackingNumber = Utils.generateTrackingNumber();
        const subtotal = this.state.getCartTotal();
        const total = subtotal; // No tax or shipping for now
        const codAmount = this.state.orderData.paymentMethod === 'cod' ? total : 0;

        return {
            "Order ID": orderId,
            "Customer Name": `${this.state.orderData.firstName} ${this.state.orderData.lastName}`,
            "Phone": this.state.orderData.phone,
            "City": this.state.orderData.city,
            "Address": this.state.orderData.address,
            "COD Amount": codAmount.toFixed(2),
            "Tracking Number": trackingNumber,
            "Courier": "BOSTA",
            "Total": total.toFixed(2),
            "Date": new Date().toISOString(),
            "Status": "New",
            "Payment Method": this.getPaymentMethodName(this.state.orderData.paymentMethod),
            "Product": this.state.cart.map(item => 
                `${item.name}${item.size ? ` - ${item.size}` : ''} (${item.quantity}x)`
            ).join(', '),
            "Quantity": this.state.cart.reduce((total, item) => total + item.quantity, 0).toString()
        };
    }

    async sendOrderToWebhook(orderData) {
        const webhookUrl = window.CONFIG?.WEBHOOK_URL;
        // If no webhook is defined, simulate a delay and return success. This
        // prevents accidental calls during local development.
        if (!webhookUrl || webhookUrl === 'WEBHOOK_URL_NOT_CONFIGURED' || webhookUrl.trim() === '') {
            console.warn('Webhook URL not configured');
            await new Promise(resolve => setTimeout(resolve, 1500));
            return true;
        }

        // Strategy 1: CORS POST with JSON. Many modern webhooks (including n8n)
        // set proper CORS headers. We explicitly set mode:'cors' so the browser
        // attempts a preflight if necessary. If this succeeds we return early.
        try {
            const resp = await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                mode: 'cors',
                body: JSON.stringify(orderData)
            });
            if (resp.ok) {
                return true;
            }
        } catch (err) {
            console.error('CORS POST webhook attempt failed:', err);
        }

        // Strategy 2: no‑cors POST without custom headers. Omitting headers avoids
        // the preflight check and still delivers the body. The response is
        // opaque but we assume success. This is useful when the endpoint does
        // not set CORS headers.
        try {
            await fetch(webhookUrl, {
                method: 'POST',
                mode: 'no-cors',
                body: JSON.stringify(orderData)
            });
            return true;
        } catch (err) {
            console.warn('no‑cors POST webhook attempt failed:', err);
        }

        // Strategy 3: sendBeacon. This avoids CORS entirely and is best effort.
        try {
            if (navigator && typeof navigator.sendBeacon === 'function') {
                const blob = new Blob([JSON.stringify(orderData)], { type: 'application/json' });
                const ok = navigator.sendBeacon(webhookUrl, blob);
                if (ok) return true;
            }
        } catch (err) {
            console.warn('sendBeacon webhook fallback failed:', err);
        }

        // Strategy 4: GET via query string using an Image. This last resort
        // constructs a GET URL with the entire payload encoded. Some services
        // accept GET requests to their webhook endpoints. We assume success.
        try {
            const query = encodeURIComponent(JSON.stringify(orderData));
            const img = new Image();
            img.src = `${webhookUrl}?payload=${query}`;
            return true;
        } catch (err) {
            console.error('Webhook GET via image attempt failed:', err);
        }

        return false;
    }

    /**
     * Send a return or exchange request to the appropriate webhook.  Payloads
     * include the customer's phone number, selected order id, reason and the
     * full order details when available.  Uses the same resilient delivery
     * strategy as sendOrderToWebhook: try a CORS POST, fall back to no‑cors,
     * then sendBeacon and finally a GET via query string.
     *
     * @param {Object} requestData The request payload to send.
     * @param {string} type Either 'return' or 'exchange' to select the endpoint.
     * @returns {Promise<boolean>} True if any attempt succeeds, false otherwise.
     */
    async sendReturnOrExchangeWebhook(requestData, type) {
        const returnUrl  = window.CONFIG?.RETURN_WEBHOOK_URL;
        const exchangeUrl = window.CONFIG?.EXCHANGE_WEBHOOK_URL;
        let url;
        if (type === 'return') url = returnUrl;
        else if (type === 'exchange') url = exchangeUrl;
        else url = null;

        if (!url || url === '' || url === 'WEBHOOK_URL_NOT_CONFIGURED') {
            console.warn('Return/Exchange webhook URL not configured');
            await new Promise(resolve => setTimeout(resolve, 500));
            return true;
        }

        // Include the request type in the payload so the webhook can easily
        // identify whether this is a return or an exchange.  We copy the
        // requestData here to avoid mutating the original object.
        const payload = { ...requestData, requestType: type };

        // Strategy 1: CORS POST with JSON
        try {
            const resp = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                mode: 'cors',
                body: JSON.stringify(payload)
            });
            if (resp.ok) {
                return true;
            }
        } catch (err) {
            console.error('Return/Exchange CORS POST attempt failed:', err);
        }

        // Strategy 2: no‑cors POST without headers
        try {
            await fetch(url, {
                method: 'POST',
                mode: 'no-cors',
                body: JSON.stringify(payload)
            });
            return true;
        } catch (err) {
            console.warn('Return/Exchange no‑cors POST attempt failed:', err);
        }

        // Strategy 3: sendBeacon
        try {
            if (navigator && typeof navigator.sendBeacon === 'function') {
                const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
                const ok = navigator.sendBeacon(url, blob);
                if (ok) return true;
            }
        } catch (err) {
            console.warn('Return/Exchange sendBeacon attempt failed:', err);
        }

        // Strategy 4: GET via query string
        try {
            const query = encodeURIComponent(JSON.stringify(payload));
            const img = new Image();
            img.src = `${url}?payload=${query}`;
            return true;
        } catch (err) {
            console.error('Return/Exchange GET via image attempt failed:', err);
        }
        return false;
    }

    showOrderSuccess(orderData) {
        const successModal = document.getElementById('successModal');
        const orderDetails = document.getElementById('orderDetails');
        const successMessage = document.getElementById('successMessage');

        if (successMessage) {
            successMessage.textContent = `Thank you for your order! Your order #${orderData['Order ID']} has been confirmed.`;
        }

        if (orderDetails) {
            orderDetails.innerHTML = `
                <div class="order-detail-row">
                    <span>Order ID:</span>
                    <span>${orderData['Order ID']}</span>
                </div>
                <div class="order-detail-row">
                    <span>Payment Method:</span>
                    <span>${orderData['Payment Method']}</span>
                </div>
                <div class="order-detail-row">
                    <span>Total:</span>
                    <span>${orderData['Total']} EGP</span>
                </div>
            `;
        }

        this.openModal('success');
    }

    closeSuccessModal() {
        this.closeModal('success');
    }

    /**
     * Persist a completed order to localStorage.  Orders are stored in a
     * "grindctrl_orders" array so that customers can later look up their
     * purchases by phone number when requesting returns or exchanges.
     * @param {Object} orderData The order data returned by prepareOrderData().
     */
    storeOrder(orderData) {
        try {
            const orders = JSON.parse(localStorage.getItem('grindctrl_orders')) || [];
            orders.push(orderData);
            localStorage.setItem('grindctrl_orders', JSON.stringify(orders));
        } catch (error) {
            console.warn('Failed to save order:', error);
        }
    }

    openSizeGuide() {
        const sizeGuideBody = document.getElementById('sizeGuideBody');
        if (sizeGuideBody) {
            sizeGuideBody.innerHTML = `
                <div class="size-guide-content">
                    <div class="size-chart">
                        <h4>T-Shirt Size Chart (cm)</h4>
                        <table>
                            <thead>
                                <tr>
                                    <th>Size</th>
                                    <th>Chest</th>
                                    <th>Length</th>
                                    <th>Shoulder</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr><td>XS</td><td>86</td><td>66</td><td>41</td></tr>
                                <tr><td>S</td><td>91</td><td>69</td><td>43</td></tr>
                                <tr><td>M</td><td>96</td><td>72</td><td>45</td></tr>
                                <tr><td>L</td><td>101</td><td>75</td><td>47</td></tr>
                                <tr><td>XL</td><td>106</td><td>78</td><td>49</td></tr>
                                <tr><td>XXL</td><td>111</td><td>81</td><td>51</td></tr>
                            </tbody>
                        </table>
                    </div>
                    
                    <div class="size-guide-tips">
                        <h4>How to Measure</h4>
                        <ul>
                            <li><strong>Chest:</strong> Measure around the fullest part of your chest</li>
                            <li><strong>Length:</strong> Measure from shoulder to bottom hem</li>
                            <li><strong>Shoulder:</strong> Measure from shoulder seam to shoulder seam</li>
                        </ul>
                    </div>
                </div>
            `;
        }
        this.openModal('sizeGuide');
    }

    openLookbook() {
        // This would open a video modal or redirect to lookbook page
        this.notifications.info('Lookbook feature coming soon!');
    }

    // ===== MODAL MANAGEMENT =====
    openModal(modalId) {
        const modal = document.getElementById(`${modalId}Modal`);
        if (modal) {
            modal.classList.add('open');
            document.body.style.overflow = 'hidden';
        }
    }

    closeModal(modalId) {
        const modal = document.getElementById(`${modalId}Modal`);
        if (modal) {
            modal.classList.remove('open');
            document.body.style.overflow = '';
        }
    }

    closeAllModals() {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            modal.classList.remove('open');
        });
        document.body.style.overflow = '';
    }

    // ===== CART AND WISHLIST TOGGLES =====
    toggleCart(force = null) {
        const cart = document.getElementById('floatingCart');
        if (!cart) return;

        if (force !== null) {
            cart.classList.toggle('open', force);
        } else {
            cart.classList.toggle('open');
        }

        if (cart.classList.contains('open')) {
            this.toggleWishlist(false); // Close wishlist if open
        }
    }

    toggleWishlist(force = null) {
        const wishlist = document.getElementById('wishlistPanel');
        if (!wishlist) return;

        if (force !== null) {
            wishlist.classList.toggle('open', force);
        } else {
            wishlist.classList.toggle('open');
        }

        if (wishlist.classList.contains('open')) {
            this.toggleCart(false); // Close cart if open
        }
    }

    toggleMobileMenu() {
        const nav = document.querySelector('.nav');
        if (nav) {
            nav.classList.toggle('open');
        }
    }

    // ===== NAVIGATION AND SCROLLING =====
    scrollToSection(sectionId) {
        const section = document.getElementById(sectionId);
        if (section) {
            const headerHeight = document.querySelector('.header').offsetHeight;
            Utils.scrollToElement(section, headerHeight + 20);
        }
    }

    setActiveNavLink(activeLink) {
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        activeLink.classList.add('active');
    }

    updateActiveNavOnScroll() {
        const sections = document.querySelectorAll('section[id]');
        const navLinks = document.querySelectorAll('.nav-link[data-section]');
        
        window.addEventListener('scroll', Utils.throttle(() => {
            const scrollPosition = window.scrollY + 100;
            
            sections.forEach(section => {
                const sectionTop = section.offsetTop;
                const sectionHeight = section.offsetHeight;
                const sectionId = section.getAttribute('id');
                
                if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
                    navLinks.forEach(link => {
                        link.classList.remove('active');
                        if (link.getAttribute('data-section') === sectionId) {
                            link.classList.add('active');
                        }
                    });
                }
            });
        }, 100));
    }

    handleScroll() {
        const scrollY = window.scrollY;
        const header = document.querySelector('.header');
        const backToTop = document.getElementById('backToTop');

        // Hide/show header on scroll
        if (scrollY > 100) {
            header?.classList.add('scrolled');
        } else {
            header?.classList.remove('scrolled');
        }

        // Show/hide back to top button
        if (scrollY > 500) {
            backToTop?.classList.add('visible');
        } else {
            backToTop?.classList.remove('visible');
        }
    }

    handleResize() {
        // Close mobile menu on resize
        if (window.innerWidth > 768) {
            const nav = document.querySelector('.nav');
            if (nav) {
                nav.classList.remove('open');
            }
        }
    }

    /**
     * Handle a customer's request to exchange the recently placed order.
     * Displays a toast notification; in a real implementation this would
     * trigger backend logic or show a form.
     */
    handleExchangeOrder() {
        this.notifications.info('Exchange request received. Our team will contact you shortly.');
    }

    /**
     * Handle a customer's request to return the recently placed order.
     * Displays a toast notification; this is a placeholder for real return logic.
     */
    handleReturnOrder() {
        this.notifications.info('Return request received. Our team will contact you shortly.');
    }

    /**
     * Open the return order modal.  This simply delegates to openModal with
     * the appropriate id.
     */
    openReturnModal() {
        this.openModal('return');
    }

    /**
     * Open the exchange order modal.
     */
    openExchangeModal() {
        this.openModal('exchange');
    }

    /**
     * Attach submit handlers to the return and exchange forms.  These forms
     * live in the footer and allow customers to request a return or
     * exchange without placing a new order.  On submission we simply
     * display a toast message and reset/close the modal.
     */
    initializeReturnExchangeForms() {
        /**
         * Look up stored orders by phone number.
         * @param {string} phone The phone number to search for.
         * @returns {Array<Object>} A list of order objects matching the phone.
         */
        const getOrdersByPhone = (phone) => {
            try {
                const orders = JSON.parse(localStorage.getItem('grindctrl_orders')) || [];
                return orders.filter(o => (o.Phone && o.Phone.replace(/[^\d]/g, '') === phone.replace(/[^\d]/g, '')));
            } catch (error) {
                console.warn('Failed to load orders for lookup:', error);
                return [];
            }
        };

        /**
         * Populate the order list container with clickable radio items.  Each
         * order is represented as a radio input inside a styled div.  The
         * submit button is disabled until the user selects one.
         * @param {HTMLElement} container The container element to populate.
         * @param {Array<Object>} orders The orders for the given phone.
         * @param {HTMLElement} submitBtn The submit <button> element.
         */
        const populateOrderSelect = (container, orders, submitBtn) => {
            container.innerHTML = '';
            if (!orders || orders.length === 0) {
                container.style.display = 'none';
                submitBtn.disabled = true;
                return;
            }
            orders.forEach(order => {
                const item = document.createElement('div');
                item.className = 'order-item';
                const label = document.createElement('label');
                const radio = document.createElement('input');
                radio.type = 'radio';
                radio.name = `${container.id}_radio`;
                radio.value = order['Order ID'];
                label.appendChild(radio);
                const text = document.createTextNode(`${order['Order ID']} – ${order.Total} ${order.Currency || ''}`);
                label.appendChild(text);
                item.appendChild(label);
                container.appendChild(item);
            });
            container.style.display = '';
            submitBtn.disabled = true;
            // Enable submit when an order is chosen
            container.addEventListener('change', (e) => {
                if (e.target && e.target.matches('input[type="radio"]')) {
                    submitBtn.disabled = false;
                }
            });
        };

        /**
         * Attach lookup and change handlers for either return or exchange forms.
         * @param {string} phoneId ID of the phone input.
         * @param {string} buttonId ID of the "Find Orders" button.
         * @param {string} selectId ID of the order select dropdown.
         * @param {string} submitId ID of the submit button.
         */
        const attachLookupHandlers = (phoneId, buttonId, containerId, submitId) => {
            const phoneInput = document.getElementById(phoneId);
            const findBtn = document.getElementById(buttonId);
            const container = document.getElementById(containerId);
            const submitBtn = document.getElementById(submitId);
            if (!phoneInput || !findBtn || !container || !submitBtn) return;
            findBtn.addEventListener('click', () => {
                const phone = phoneInput.value.trim();
                if (!phone) {
                    this.notifications.error('Please enter a phone number.');
                    return;
                }
                const orders = getOrdersByPhone(phone);
                if (orders.length === 0) {
                    this.notifications.error('No orders found for this phone number.');
                    populateOrderSelect(container, [], submitBtn);
                    return;
                }
                populateOrderSelect(container, orders, submitBtn);
            });
        };

        // Attach handlers for Return
        attachLookupHandlers('returnPhone', 'findReturnOrders', 'returnOrderList', 'returnSubmit');
        // Attach handlers for Exchange
        attachLookupHandlers('exchangePhone', 'findExchangeOrders', 'exchangeOrderList', 'exchangeSubmit');

        // Submit handlers for return and exchange forms
        const returnForm = document.getElementById('returnForm');
        if (returnForm) {
            returnForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const phoneVal = document.getElementById('returnPhone')?.value.trim();
                const reasonVal = document.getElementById('returnMessage')?.value.trim();
                // Find the selected order from the radio list
                const selectedRadio = document.querySelector('#returnOrderList input[type="radio"]:checked');
                if (!phoneVal) {
                    this.notifications.error('Please enter a phone number.');
                    return;
                }
                if (!selectedRadio) {
                    this.notifications.error('Please select an order to return.');
                    return;
                }
                const orderId = selectedRadio.value;
                // Look up the full order details by phone and id
                const orders = getOrdersByPhone(phoneVal);
                const orderObj = orders.find(o => o['Order ID'] === orderId) || null;
                const payload = {
                    phone: phoneVal,
                    orderId: orderId,
                    reason: reasonVal,
                    order: orderObj
                };
                const success = await this.sendReturnOrExchangeWebhook(payload, 'return');
                if (success) {
                    this.notifications.success('Return request submitted! Our support team will contact you soon.');
                } else {
                    this.notifications.error('Failed to submit return request. Please try again.');
                }
                returnForm.reset();
                // Hide order list and disable submit again
                const listEl = document.getElementById('returnOrderList');
                const submitBtn = document.getElementById('returnSubmit');
                if (listEl) listEl.style.display = 'none';
                if (submitBtn) submitBtn.disabled = true;
                this.closeModal('return');
            });
        }
        const exchangeForm = document.getElementById('exchangeForm');
        if (exchangeForm) {
            exchangeForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const phoneVal = document.getElementById('exchangePhone')?.value.trim();
                const reasonVal = document.getElementById('exchangeMessage')?.value.trim();
                const selectedRadio = document.querySelector('#exchangeOrderList input[type="radio"]:checked');
                if (!phoneVal) {
                    this.notifications.error('Please enter a phone number.');
                    return;
                }
                if (!selectedRadio) {
                    this.notifications.error('Please select an order to exchange.');
                    return;
                }
                const orderId = selectedRadio.value;
                const orders = getOrdersByPhone(phoneVal);
                const orderObj = orders.find(o => o['Order ID'] === orderId) || null;
                const payload = {
                    phone: phoneVal,
                    orderId: orderId,
                    reason: reasonVal,
                    order: orderObj
                };
                const success = await this.sendReturnOrExchangeWebhook(payload, 'exchange');
                if (success) {
                    this.notifications.success('Exchange request submitted! Our support team will contact you soon.');
                } else {
                    this.notifications.error('Failed to submit exchange request. Please try again.');
                }
                exchangeForm.reset();
                const listEl = document.getElementById('exchangeOrderList');
                const submitBtn = document.getElementById('exchangeSubmit');
                if (listEl) listEl.style.display = 'none';
                if (submitBtn) submitBtn.disabled = true;
                this.closeModal('exchange');
            });
        }
    }
}

// ===== GLOBAL FUNCTIONS =====
window.scrollToSection = function(sectionId) {
    if (window.app) {
        window.app.scrollToSection(sectionId);
    }
};

window.openLookbook = function() {
    if (window.app) {
        window.app.openLookbook();
    }
};

window.openSizeGuide = function() {
    if (window.app) {
        window.app.openSizeGuide();
    }
};

window.closeSuccessModal = function() {
    if (window.app) {
        window.app.closeSuccessModal();
    }
};

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
    window.app = new GrindCTRLApp();
});

// ===== SERVICE WORKER REGISTRATION =====
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('SW registered: ', registration);
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}

/* Injected robust close handling */
document.addEventListener('click', function(e){
  const cartBtn     = e.target.closest && e.target.closest('.cart-close');
  const wishlistBtn = e.target.closest && e.target.closest('.wishlist-close');
  const modalBtn    = e.target.closest && e.target.closest('.modal-close');
  const overlay     = (e.target.classList && e.target.classList.contains('modal-overlay')) ? e.target : null;

  if (cartBtn)     { try { window.app && app.toggleCart(false); } catch(_){} return; }
  if (wishlistBtn) { try { window.app && app.toggleWishlist(false); } catch(_){} return; }
  if (modalBtn)    {
    const m = modalBtn.closest('.modal');
    if (m && m.id) { 
      try { 
        const id = m.id.replace('Modal','').replace(/Modal$/,'');
        window.app && app.closeModal(id); 
      } catch(_){} 
    }
    return;
  }
  if (overlay) {
    const m = overlay.closest('.modal');
    if (m && m.id) {
      try { 
        const id = m.id.replace('Modal','').replace(/Modal$/,'');
        window.app && app.closeModal(id); 
      } catch(_){} 
    }
  }
});
document.addEventListener('keydown', function(e){
  if (e.key === 'Escape') {
    try { window.app && app.closeAllModals && app.closeAllModals(); } catch(_){}
  }
});

