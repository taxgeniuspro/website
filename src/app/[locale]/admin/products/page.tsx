'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { logger } from '@/lib/logger';
import { Plus, Edit, Trash2, Image as ImageIcon, X, Upload } from 'lucide-react';
import Image from 'next/image';

interface ProductImage {
  url: string;
  altText: string;
  isPrimary: boolean;
  isClientUpload: boolean;
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  images: ProductImage[];
  category: string | null;
  type: string;
  isActive: boolean;
  recurring: boolean;
  interval: string | null;
  availableFor: string[];
  printable: boolean | null;
  digitalDownload: boolean | null;
  stock: number | null;
  sku: string | null;
  squareItemId: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function AdminProductsPage() {
  const { data: session } = useSession(); const user = session?.user;
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: 'TAX_PREP',
    type: 'ONE_TIME',
    isActive: true,
    recurring: false,
    interval: '',
    availableFor: [] as string[],
    printable: false,
    digitalDownload: false,
    stock: '',
    sku: '',
    images: [] as ProductImage[],
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/admin/products');
      if (response.ok) {
        const data = await response.json();
        setProducts(data);
      }
    } catch (error) {
      logger.error('Failed to fetch products', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setSelectedFiles((prev) => [...prev, ...files]);

    // Create preview URLs
    const newPreviewUrls = files.map((file) => URL.createObjectURL(file));
    setPreviewUrls((prev) => [...prev, ...newPreviewUrls]);
  };

  const removeImage = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    URL.revokeObjectURL(previewUrls[index]);
    setPreviewUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const removeExistingImage = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  const uploadImages = async (): Promise<ProductImage[]> => {
    if (selectedFiles.length === 0) return [];

    const formData = new FormData();
    selectedFiles.forEach((file) => {
      formData.append('files', file);
    });

    const response = await fetch('/api/admin/products/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to upload images');
    }

    const { images } = await response.json();
    return images;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);

    try {
      // Upload new images if any
      let uploadedImages: ProductImage[] = [];
      if (selectedFiles.length > 0) {
        uploadedImages = await uploadImages();
      }

      // Combine existing images with newly uploaded ones
      const allImages = [...formData.images, ...uploadedImages];

      // Ensure at least one image is marked as primary
      if (allImages.length > 0 && !allImages.some((img) => img.isPrimary)) {
        allImages[0].isPrimary = true;
      }

      const productData = {
        ...formData,
        price: parseFloat(formData.price),
        stock: formData.stock ? parseInt(formData.stock) : null,
        images: allImages,
      };

      const url = editingProduct
        ? `/api/admin/products/${editingProduct.id}`
        : '/api/admin/products';
      const method = editingProduct ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productData),
      });

      if (response.ok) {
        await fetchProducts();
        resetForm();
        setShowDialog(false);
      } else {
        const error = await response.json();
        logger.error('Failed to save product', error);
        alert(error.error || 'Failed to save product');
      }
    } catch (error) {
      logger.error('Error saving product', error);
      alert('An error occurred while saving the product');
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description || '',
      price: product.price.toString(),
      category: product.category || 'TAX_PREP',
      type: product.type,
      isActive: product.isActive,
      recurring: product.recurring,
      interval: product.interval || '',
      availableFor: product.availableFor || [],
      printable: product.printable || false,
      digitalDownload: product.digitalDownload || false,
      stock: product.stock?.toString() || '',
      sku: product.sku || '',
      images: Array.isArray(product.images) ? product.images : [],
    });
    setShowDialog(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
      const response = await fetch(`/api/admin/products/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchProducts();
      } else {
        alert('Failed to delete product');
      }
    } catch (error) {
      logger.error('Error deleting product', error);
      alert('An error occurred while deleting the product');
    }
  };

  const resetForm = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      description: '',
      price: '',
      category: 'TAX_PREP',
      type: 'ONE_TIME',
      isActive: true,
      recurring: false,
      interval: '',
      availableFor: [],
      printable: false,
      digitalDownload: false,
      stock: '',
      sku: '',
      images: [],
    });
    setSelectedFiles([]);
    previewUrls.forEach((url) => URL.revokeObjectURL(url));
    setPreviewUrls([]);
  };

  const toggleAvailableFor = (role: string) => {
    setFormData((prev) => ({
      ...prev,
      availableFor: prev.availableFor.includes(role)
        ? prev.availableFor.filter((r) => r !== role)
        : [...prev.availableFor, role],
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading products...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Product Management</h1>
          <p className="text-muted-foreground mt-2">
            Manage products for tax preparers, affiliates, and clients
          </p>
        </div>
        <Button onClick={() => setShowDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Product
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product) => {
          const images = Array.isArray(product.images) ? product.images : [];
          const primaryImage = images.find((img) => img.isPrimary) || images[0];

          return (
            <Card key={product.id} className="overflow-hidden">
              {primaryImage && (
                <div className="relative h-48 bg-muted">
                  <Image
                    src={primaryImage.url}
                    alt={primaryImage.altText || product.name}
                    fill
                    className="object-cover"
                  />
                </div>
              )}
              {!primaryImage && product.imageUrl && (
                <div className="relative h-48 bg-muted">
                  <Image src={product.imageUrl} alt={product.name} fill className="object-cover" />
                </div>
              )}
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="line-clamp-1">{product.name}</CardTitle>
                    <CardDescription className="mt-1">
                      ${product.price.toFixed(2)}
                      {product.recurring && ` / ${product.interval}`}
                    </CardDescription>
                  </div>
                  <Badge variant={product.isActive ? 'default' : 'secondary'}>
                    {product.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {product.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {product.description}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-1">
                    {product.printable && (
                      <Badge variant="outline" className="text-xs">
                        Printable
                      </Badge>
                    )}
                    {product.digitalDownload && (
                      <Badge variant="outline" className="text-xs">
                        Digital
                      </Badge>
                    )}
                    {product.stock !== null && (
                      <Badge variant="outline" className="text-xs">
                        Stock: {product.stock}
                      </Badge>
                    )}
                    {images.length > 1 && (
                      <Badge variant="outline" className="text-xs">
                        {images.length} images
                      </Badge>
                    )}
                  </div>
                  {product.availableFor.length > 0 && (
                    <div className="text-xs text-muted-foreground">
                      Available for: {product.availableFor.join(', ')}
                    </div>
                  )}
                  <div className="flex gap-2 mt-4">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => handleEdit(product)}
                    >
                      <Edit className="mr-1 h-3 w-3" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(product.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {products.length === 0 && (
        <Card className="py-12">
          <CardContent className="text-center">
            <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No products yet</h3>
            <p className="text-muted-foreground mb-4">Get started by creating your first product</p>
            <Button onClick={() => setShowDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Product
            </Button>
          </CardContent>
        </Card>
      )}

      <Dialog
        open={showDialog}
        onOpenChange={(open) => {
          if (!open) resetForm();
          setShowDialog(open);
        }}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProduct ? 'Edit Product' : 'Create Product'}</DialogTitle>
            <DialogDescription>
              Add product details and upload images. Mark printable products to allow customer
              uploads.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Product Images */}
            <div className="space-y-4">
              <Label>Product Images</Label>

              {/* Existing Images */}
              {formData.images.length > 0 && (
                <div className="grid grid-cols-3 gap-4">
                  {formData.images.map((img, index) => (
                    <div key={index} className="relative group">
                      <Image
                        src={img.url}
                        alt={img.altText}
                        width={200}
                        height={200}
                        className="rounded-md object-cover w-full h-32"
                      />
                      {img.isPrimary && (
                        <Badge className="absolute top-2 left-2" variant="default">
                          Primary
                        </Badge>
                      )}
                      <Button
                        type="button"
                        size="icon"
                        variant="destructive"
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removeExistingImage(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* New Image Previews */}
              {previewUrls.length > 0 && (
                <div className="grid grid-cols-3 gap-4">
                  {previewUrls.map((url, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={url}
                        alt={`Preview ${index + 1}`}
                        className="rounded-md object-cover w-full h-32"
                      />
                      <Badge className="absolute top-2 left-2" variant="secondary">
                        New
                      </Badge>
                      <Button
                        type="button"
                        size="icon"
                        variant="destructive"
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removeImage(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Upload Button */}
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-muted-foreground/50 transition-colors">
                <input
                  type="file"
                  id="image-upload"
                  multiple
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <label htmlFor="image-upload" className="cursor-pointer flex flex-col items-center">
                  <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                  <span className="text-sm font-medium">Click to upload images</span>
                  <span className="text-xs text-muted-foreground mt-1">
                    PNG, JPG, WEBP up to 10MB each
                  </span>
                </label>
              </div>
            </div>

            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="name">Product Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="price">Price ($) *</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="sku">SKU</Label>
                <Input
                  id="sku"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  placeholder="Optional"
                />
              </div>

              <div>
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TAX_PREP">Tax Preparation</SelectItem>
                    <SelectItem value="MARKETING">Marketing Materials</SelectItem>
                    <SelectItem value="TRAINING">Training & Resources</SelectItem>
                    <SelectItem value="SOFTWARE">Software & Tools</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="stock">Stock (leave empty for unlimited)</Label>
                <Input
                  id="stock"
                  type="number"
                  min="0"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                  placeholder="Unlimited"
                />
              </div>
            </div>

            {/* Product Attributes */}
            <div className="space-y-3">
              <Label>Product Attributes</Label>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.printable}
                    onChange={(e) => setFormData({ ...formData, printable: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm">Printable (allows customer image upload)</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.digitalDownload}
                    onChange={(e) =>
                      setFormData({ ...formData, digitalDownload: e.target.checked })
                    }
                    className="rounded"
                  />
                  <span className="text-sm">Digital Download</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm">Active</span>
                </label>
              </div>
            </div>

            {/* Available For Roles */}
            <div className="space-y-3">
              <Label>Available For (select roles)</Label>
              <div className="flex flex-wrap gap-4">
                {['TAX_PREPARER', 'AFFILIATE', 'REFERRER', 'CLIENT'].map((role) => (
                  <label key={role} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.availableFor.includes(role)}
                      onChange={() => toggleAvailableFor(role)}
                      className="rounded"
                    />
                    <span className="text-sm">{role.replace('_', ' ')}</span>
                  </label>
                ))}
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  resetForm();
                  setShowDialog(false);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={uploading}>
                {uploading ? 'Saving...' : editingProduct ? 'Update Product' : 'Create Product'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
