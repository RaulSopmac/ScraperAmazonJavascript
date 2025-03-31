//wait all contents show, before execute code
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('searchInput');
    const searchButton = document.getElementById('searchButton');
    const resultsContainer = document.getElementById('results');
    const loadingIndicator = document.getElementById('loading');
    const errorContainer = document.getElementById('error');

    //API endpoint /api/scrape
    const API_URL = 'http://localhost:3000/api/scrape';

    //shows loading while clearing errors and previous results
    function showLoading() {
        loadingIndicator.classList.remove('hidden');
        errorContainer.classList.add('hidden');
        resultsContainer.innerHTML = '';
    }
    
    function hideLoading() {
        loadingIndicator.classList.add('hidden');
    }

    function showError(message) {
        errorContainer.textContent = message;
        errorContainer.classList.remove('hidden');
        hideLoading();
    }
    //creating a cart to show on the frontend
    function createProductCard(product) {
        return `
            <div class="product-card">
                <img src="${product.image}" alt="${product.title}" class="product-image">
                <div class="product-info">
                    <h3 class="product-title">${product.title}</h3>
                    <div class="product-rating">★ ${product.rating}</div>
                    <div class="product-Numbereviews">${product.Numbereviews} reviews</div>
                </div>
            </div>
        `;
    }
    //function to show that the user did not enter a keyword
    async function searchProducts() {
        const keyword = searchInput.value.trim();
        
        if (!keyword) {
            showError('Please enter a search term');
            return;
        }

        showLoading();
        //try/catch showing if Amazon blocked access or if the frontend did not find the products
        try {
             // Makes a GET request to the backend API, passing the keyword entered by the user.
            //encodeURIComponent(keyword) ensures that special characters in the search (such as spaces) are correctly encoded.
            const response = await fetch(`${API_URL}?keyword=${encodeURIComponent(keyword)}`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to fetch products');
            }

            if (!data.success || data.products.length === 0) {
                showError('No products found');
                return;
            }
            //basically I map all the products that come back from the api and generate the productcard
            resultsContainer.innerHTML = data.products.map(createProductCard).join('');
            hideLoading();
            errorContainer.classList.add('hidden');
        } catch (error) {
            showError(error.message);
        }
    }
    //making enter work like click
    searchButton.addEventListener('click', searchProducts);
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            searchProducts();
        }
    });
}); 