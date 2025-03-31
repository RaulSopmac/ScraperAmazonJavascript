import express from "express";
const axios = require ('axios') 
import { JSDOM } from "jsdom";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { HttpsProxyAgent } from "https-proxy-agent";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

//setting up a proxy to avoid amazon blocks
const proxy = "http://200.250.131.218:80"
const proxyAgent = new HttpsProxyAgent(proxy);

//making a request on amazon, if it fails try it a maximum of 3 times and it shows the error
async function makeRequest(url, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await axios.get(url, {
                httpAgent:proxyAgent,
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                    "Accept-Language": "pt-BR,pt;q=0.9",
                    "Accept-Encoding": "gzip, deflate, br",
                    "Referer": "https://www.google.com/",
                    "DNT": "1",
                    "Upgrade-Insecure-Requests": "1"
                },
                //trying to avoid amazon's blockade
                timeout: 30000,
                validateStatus: function (status) {
                    return status >= 200 && status < 500;
                }
            });

            if (response.status === 200 && response.data) {
                return response;
            }
            //console to show error
            console.log(`Attempt ${i + 1} failed with status ${response.status}`);
            await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error) {
            console.log(`Attempt ${i + 1} failed with error: ${error.message}`);
            if (error.response) {
                console.log("Error response data:", error.response.data);
                console.log("Error response status:", error.response.status);
            }
            if (i === retries - 1) throw error;
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
    throw new Error("All retry attempts failed");
}
//Route to search for products on Amazon based on a keyword
app.get("/api/scrape", async (req, res) => {
    const keyword = req.query.keyword;

    if (!keyword) {
        return res.status(400).json({ error: "Keyword parameter is required" });
    }

    try {
        const url = `https://www.amazon.com/s?k=${encodeURIComponent(keyword)}`;
        console.log("Making request to Amazon through proxy...");
        
        const response = await makeRequest(url);
        console.log("Response received, status:", response.status);
        
        if (!response.data) {
            throw new Error("Empty response from server");
        }

        const dom = new JSDOM(response.data);
        const document = dom.window.document;

        const products = [];
        const productElements = document.querySelectorAll("div.s-main-slot div.s-result-item");

        //console to show if the product reading went well
        console.log(`Found ${productElements.length} product elements`);

        productElements.forEach(element => {
                const titleElement = element.querySelector("h2.a-size-base-plus span");
                const ratingElement = element.querySelector(".a-icon-alt");
                const NumbereviewsElement = element.querySelector("span.a-size-base");
                const imageElement = element.querySelector("img.s-image");
                
                if (titleElement && imageElement) {
                    products.push({
                        title: titleElement.textContent.trim(),
                        rating: ratingElement ? ratingElement.textContent.split(" ")[0] : "N/A",
                        Numbereviews: NumbereviewsElement ? NumbereviewsElement.textContent.trim() : "N/A",
                        image: imageElement.src
                        
                    });
                }
        });

        if (productElements.length >= 0) {
            console.log(`Successfully extracted ${products.length} products`);
            console.log(productElements.length.price);
            res.json({
                success: true,
                count: products.length,
                products: products
            });
        } else {
            console.log("No products found in the response");
            console.log(response.data);
            res.status(404).json({
                success: false,
                error: "BACKENDNo products found"
            });
        }

    } catch (error) {
        console.error("Scraping error:", error.message);
        if (error.response) {
            console.error("Error response:", error.response.status, error.response.data);
        }
        res.status(500).json({
            success: false,
            error: "Failed to scrape Amazon",
            details: error.message
        });
    }
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
}); 