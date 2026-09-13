export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  category: string;
  imageUrl?: string | null;
  isActive: boolean;
}

export interface CreateProductRequest {
  name: string;
  price: number;
  stock: number;
  category: string;
  imageUrl?: string | null;
}

export interface UpdateProductRequest extends CreateProductRequest {
  id: string;
}

export interface PagedResult<T> {
  items: T[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}
