'use client'

import { useEffect, useState } from 'react'

interface Product {
  id: string
  title: string
  description: string
  link: string
  price: string
  availability: string
  image_link: string
  enable_search: boolean
  enable_checkout: boolean
  brand: string
  product_category: string
  seller_name: string
  condition: string
  product_type: string
  google_product_category: string
}

export default function ChatGPTFeedViewer() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadFeed = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch('https://gangrunprinting.com/feeds/chatgpt-products.json')

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      setProducts(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load feed')
      console.error('Feed error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadFeed()
  }, [])

  const categories = [...new Set(products.map((p) => p.product_category))]
  const totalPrice = products.reduce((sum, p) => sum + parseFloat(p.price.split(' ')[0]), 0)
  const avgPrice = products.length > 0 ? (totalPrice / products.length).toFixed(2) : '0.00'
  const inStockCount = products.filter((p) => p.availability === 'in_stock').length

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-purple-900 p-5">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-2xl p-8 mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">📦 ChatGPT Products Feed Viewer</h1>
          <p className="text-gray-600 mb-4">
            Live data from: <strong>https://gangrunprinting.com/feeds/chatgpt-products.json</strong>
          </p>
          <button
            className="bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            onClick={loadFeed}
          >
            🔄 Refresh Data
          </button>
        </div>

        {/* Stats */}
        {!loading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-8">
            <div className="bg-white rounded-xl shadow-2xl p-6 text-center">
              <div className="text-4xl font-bold text-purple-600 mb-2">{products.length}</div>
              <div className="text-sm text-gray-600 uppercase tracking-wide">Total Products</div>
            </div>
            <div className="bg-white rounded-xl shadow-2xl p-6 text-center">
              <div className="text-4xl font-bold text-purple-600 mb-2">{categories.length}</div>
              <div className="text-sm text-gray-600 uppercase tracking-wide">Categories</div>
            </div>
            <div className="bg-white rounded-xl shadow-2xl p-6 text-center">
              <div className="text-4xl font-bold text-purple-600 mb-2">${avgPrice}</div>
              <div className="text-sm text-gray-600 uppercase tracking-wide">Avg Price</div>
            </div>
            <div className="bg-white rounded-xl shadow-2xl p-6 text-center">
              <div className="text-4xl font-bold text-purple-600 mb-2">{inStockCount}</div>
              <div className="text-sm text-gray-600 uppercase tracking-wide">In Stock</div>
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="text-center py-20 text-white text-2xl">Loading products...</div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-500 text-white p-6 rounded-xl mb-8 text-center">
            ❌ Error loading feed: {error}
          </div>
        )}

        {/* Products Grid */}
        {!loading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {products.map((product) => (
              <div
                key={product.id}
                className="bg-white rounded-xl shadow-2xl overflow-hidden hover:shadow-3xl hover:-translate-y-1 transition-all"
              >
                <img
                  alt={product.title}
                  className="w-full h-48 object-cover bg-gray-100"
                  loading="lazy"
                  src={product.image_link}
                  onError={(e) => {
                    e.currentTarget.src =
                      'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="200"%3E%3Crect fill="%23f5f5f5" width="400" height="200"/%3E%3Ctext fill="%23999" font-family="Arial" font-size="18" x="50%25" y="50%25" text-anchor="middle" dominant-baseline="middle"%3ENo Image%3C/text%3E%3C/svg%3E'
                  }}
                />
                <div className="p-5">
                  <h2 className="text-xl font-bold text-gray-800 mb-2">{product.title}</h2>
                  <div className="text-3xl font-bold text-green-600 mb-3">
                    ${product.price.split(' ')[0]}
                  </div>
                  <span className="inline-block bg-purple-600 text-white text-xs px-3 py-1 rounded-full mb-4">
                    {product.product_category}
                  </span>
                  <p className="text-gray-600 text-sm mb-4 line-clamp-3">{product.description}</p>

                  <div className="border-t pt-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Brand:</span>
                      <span className="font-medium">{product.brand}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Availability:</span>
                      <span
                        className={`font-semibold ${product.availability === 'in_stock' ? 'text-green-600' : 'text-red-600'}`}
                      >
                        {product.availability.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Condition:</span>
                      <span className="font-medium">{product.condition.toUpperCase()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Search Enabled:</span>
                      <span className="font-medium">
                        {product.enable_search ? '✅ Yes' : '❌ No'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Checkout:</span>
                      <span className="font-medium">
                        {product.enable_checkout ? '✅ Enabled' : '⚠️ Disabled'}
                      </span>
                    </div>
                  </div>

                  <a
                    className="block mt-4 bg-purple-600 hover:bg-purple-700 text-white text-center py-3 rounded-lg font-semibold transition-colors"
                    href={product.link}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    View Product →
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Raw JSON */}
        {!loading && !error && (
          <div className="bg-white rounded-xl shadow-2xl p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">📋 Raw JSON Data</h2>
            <pre className="bg-gray-900 text-green-400 p-5 rounded-lg overflow-x-auto text-sm max-h-96 overflow-y-auto">
              {JSON.stringify(products, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}
