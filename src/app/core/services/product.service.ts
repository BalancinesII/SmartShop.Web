import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CreateProductRequest,
  PagedResult,
  Product,
  UpdateProductRequest
} from '../models/product.model';

@Injectable({ providedIn: 'root' })
export class ProductService {
  private readonly baseUrl = `${environment.apiUrl}/Products`;

  constructor(private http: HttpClient) {}

  getAll(pageNumber = 1, pageSize = 10): Observable<PagedResult<Product>> {
    return this.http.get<PagedResult<Product>>(this.baseUrl, {
      params: { pageNumber, pageSize }
    });
  }

  create(request: CreateProductRequest): Observable<Product> {
    return this.http.post<Product>(this.baseUrl, request);
  }

  update(request: UpdateProductRequest): Observable<Product> {
    return this.http.put<Product>(`${this.baseUrl}/${request.id}`, request);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  generateDescription(id: string): Observable<{ description: string }> {
    return this.http.post<{ description: string }>(`${this.baseUrl}/${id}/describe`, {});
  }
}
