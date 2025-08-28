Total lines: 3215
Reading lines: 2801-3000

                    document.getElementById("exchangeSummary").style.display = "block";
                }
            };

            // Handle item selection with visual product cards instead of dropdown
            let selectedNewProduct = null;
            const priceDeltaDiv = document.getElementById("priceDelta");
            const deltaAmountSpan = document.getElementById("deltaAmount");
            const deltaExplanation = document.getElementById("deltaExplanation");
            const productPreview = document.getElementById("exchangeProductPreview");
            
            // Create visual product selection grid
            const createProductSelectionGrid = () => {
                console.log("[Debug] Creating product selection grid...");
                const productGridContainer = document.getElementById("exchangeProductGrid");
                console.log("[Debug] Product grid container:", productGridContainer);
                console.log("[Debug] Products available:", app.state.products);
                console.log("[Debug] Products length:", app.state.products ? app.state.products.length : "undefined");
                
                if (!productGridContainer) {
                    console.log("[Debug] ERROR: exchangeProductGrid container not found!");
                    return;
                }
                
                if (!app.state.products || !app.state.products.length) {
                    console.log("[Debug] ERROR: No products available in app.state.products");
                    productGridContainer.innerHTML = "<p>No products available for exchange. Please try again later.</p>";
                    return;
                }

                productGridContainer.innerHTML = `
                    <h4>Select New Product</h4>
                    <div class="exchange-product-grid">
                        ${app.state.products.map(product => `
                            <div class="exchange-product-card" data-product-id="${product.id}">
                                <div class="product-image-container">
                                    <img src="${product.images[0]}" alt="${product.name}" class="product-image" loading="lazy">
                                    ${product.originalPrice ? `
                                        <div class="discount-badge">
                                            ${Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}% OFF
                                        </div>
                                    ` : ""}
                                </div>
                                <div class="product-info">
                                    <h5 class="product-name">${product.name}</h5>
                                    <div class="product-price">
                                        <span class="current-price">${product.price.toFixed(2)} EGP</span>
                                        ${product.originalPrice ? `
                                            <span class="original-price">${product.originalPrice.toFixed(2)} EGP</span>
                                        ` : ""}
                                    </div>
                                    ${product.rating ? `
                                        <div class="product-rating">
                                            <div class="stars">${app.generateStars(product.rating)}</div>
                                            <span class="rating-text">(${product.reviewCount || 0})</span>
                                        </div>
                                    ` : ""}
                                    <div class="product-select-indicator">
                                        <i class="fas fa-check-circle"></i>
                                        <span>Click to select</span>
                                    </div>
                                </div>
                            </div>
                        `).join("")}
                    </div>
                `;

                // Add click handlers to product cards
                const productCards = productGridContainer.querySelectorAll(".exchange-product-card");
                productCards.forEach(card => {
                    card.addEventListener("click", function() {
                        const productId = this.getAttribute("data-product-id");
                        const product = app.state.products.find(p => p.id === productId);
                        
                        if (product) {
                            // Remove selection from all cards
                            productCards.forEach(c => c.classList.remove("selected"));
                            // Add selection to clicked card
                            this.classList.add("selected");
                            
                            // Update selected product
                            selectedNewProduct = product;
                            
                            // Update price calculation
                            updatePriceCalculation();
                            
                            // Scroll to price comparison section
                            setTimeout(() => {
                                priceDeltaDiv.scrollIntoView({ behavior: "smooth", block: "center" });
                            }, 300);
                        }
                    });
                    
                    // Add hover effects
                    card.addEventListener("mouseenter", function() {
                        if (!this.classList.contains("selected")) {
                            this.style.transform = "translateY(-2px)";
                            this.style.boxShadow = "0 8px 25px rgba(0,0,0,0.15)";
                        }
                    });
                    
                    card.addEventListener("mouseleave", function() {
                        if (!this.classList.contains("selected")) {
                            this.style.transform = "translateY(0)";
                            this.style.boxShadow = "";
                        }
                    });
                });
            };

            const updatePriceCalculation = () => {
                if (selectedNewProduct && selectedOrder) {
                    const oldProductPrice = selectedOrder ? parseFloat(selectedOrder["Total"]) || 0 : 0;
                    const newPrice = selectedNewProduct.price || 0;
                    const delta = newPrice - oldProductPrice;
                    const deltaText = delta >= 0 ? `+${delta.toFixed(2)}` : delta.toFixed(2);

                    priceDeltaDiv.style.display = "block";
                    deltaAmountSpan.textContent = `${deltaText} EGP`;
                    deltaAmountSpan.className = delta >= 0 ? "positive" : "negative";

                    // Show clear explanation with enhanced styling
                    if (delta > 0) {
                        deltaExplanation.innerHTML = `
                            <div class="explanation-item payment-required">
                                <i class="fas fa-credit-card"></i>
                                <div>
                                    <strong>Additional Payment Required</strong>
                                    <p>You will need to pay <strong>${delta.toFixed(2)} EGP extra</strong> for this exchange</p>
                                </div>
                            </div>
                            <div class="explanation-item delivery-info">
                                <i class="fas fa-truck"></i>
                                <div>
                                    <strong>Payment on Delivery</strong>
                                    <p>Payment will be collected when the new item is delivered</p>
                                </div>
                            </div>
                        `;
                    } else if (delta < 0) {
                        const refundAmount = Math.abs(delta);
                        deltaExplanation.innerHTML = `
                            <div class="explanation-item refund-info">
                                <i class="fas fa-money-bill-wave"></i>
                                <div>
                                    <strong>Refund Due</strong>
                                    <p>You will receive a <strong>${refundAmount.toFixed(2)} EGP refund</strong></p>
                                </div>
                            </div>
                            <div class="explanation-item processing-info">
                                <i class="fas fa-clock"></i>
                                <div>
                                    <strong>Refund Processing</strong>
                                    <p>Refund will be processed after the exchange is completed</p>
                                </div>
                            </div>
                        `;
                    } else {
                        deltaExplanation.innerHTML = `
                            <div class="explanation-item same-price">
                                <i class="fas fa-check-circle"></i>
                                <div>
                                    <strong>Perfect Match!</strong>
                                    <p><strong>No additional payment required</strong> - same price exchange</p>
                                </div>
                            </div>
                        `;
                    }

                    // Show detailed product comparison
                    this.renderExchangeComparison(selectedOrder, selectedNewProduct, delta);
                    productPreview.style.display = "block";
                } else {
                    priceDeltaDiv.style.display = "none";
                    productPreview.style.display = "none";
                }
            };

            // Insert continue buttons (they were already created earlier)
            const firstFormSection = exchangeForm.querySelector(".form-section:first-child");
            if (firstFormSection) {
                firstFormSection.appendChild(step1ContinueBtn);
            }

            if (orderSelectionSection) {
                orderSelectionSection.appendChild(step2ContinueBtn);
            }

            // Step 1 Continue Handler
            step1ContinueBtn.addEventListener("click", () => {
                const customerData = validateStep1();
                if (customerData && showOrderHistory(customerData)) {
                    step1ContinueBtn.style.display = "none";
                }
            });

            // Step 2 Continue Handler
            step2ContinueBtn.addEventListener("click", async () => {
                const exchangeOrderList = document.getElementById("exchangeOrderList");
                const selectedOrderId = exchangeOrderList.getSelectedOrderId ? exchangeOrderList.getSelectedOrderId() : null;
                const customerData = validateStep1();

                if (selectedOrderId) {
                    selectedOrder = getOrdersByPhoneOrEmail(customerData.phone, customerData.email).find(o => o["Order ID"] === selectedOrderId);
                    if (selectedOrder) {
                        // Hide order selection and show item selection
                        orderSelectionSection.style.display = "none";
                        itemSelectionSection.style.display = "block";
                        createProductSelectionGrid();
                        step2ContinueBtn.style.display = "none";
                        exchangeSubmitBtn.style.display = "block";
                    }
                }
            });


