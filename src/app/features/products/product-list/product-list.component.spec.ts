import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { ProductListComponent } from './product-list.component';
import { ProductService } from '../../../core/services/product.service';
import { AuthService } from '../../../core/services/auth.service';
import { PagedResult, Product } from '../../../core/models/product.model';

describe('ProductListComponent', () => {
  let fixture: ComponentFixture<ProductListComponent>;
  let element: HTMLElement;
  // A Subject lets each test decide when (and whether) the API "responds".
  let response$: Subject<PagedResult<Product>>;
  let productService: { getAll: ReturnType<typeof vi.fn> };

  const emptyPage: PagedResult<Product> = {
    items: [],
    pageNumber: 1,
    pageSize: 9,
    totalCount: 0,
    totalPages: 0,
    hasPreviousPage: false,
    hasNextPage: false
  };

  beforeEach(() => {
    vi.useFakeTimers();

    response$ = new Subject<PagedResult<Product>>();
    productService = { getAll: vi.fn(() => response$.asObservable()) };

    TestBed.configureTestingModule({
      imports: [ProductListComponent],
      providers: [
        { provide: ProductService, useValue: productService },
        { provide: AuthService, useValue: { isAdmin: signal(false) } }
      ]
    });

    fixture = TestBed.createComponent(ProductListComponent);
    element = fixture.nativeElement;
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows a spinner while the products are loading', () => {
    expect(productService.getAll).toHaveBeenCalledWith(1, 9);
    expect(fixture.componentInstance.loading()).toBe(true);
    expect(element.querySelector('.loading mat-spinner')).not.toBeNull();
    expect(element.querySelector('.grid')).toBeNull();
  });

  it('does not show the slow-load hint before 3 seconds', () => {
    vi.advanceTimersByTime(2999);
    fixture.detectChanges();

    expect(fixture.componentInstance.slowLoad()).toBe(false);
    expect(element.querySelector('.loading-hint')).toBeNull();
  });

  it('shows the slow-load hint after 3 seconds of loading', () => {
    vi.advanceTimersByTime(3000);
    fixture.detectChanges();

    const hint = element.querySelector('.loading-hint');
    expect(fixture.componentInstance.slowLoad()).toBe(true);
    expect(hint?.textContent).toContain('Waking up the demo server');
  });

  it('hides the slow-load hint once the products arrive', () => {
    vi.advanceTimersByTime(3000);
    response$.next(emptyPage);
    fixture.detectChanges();

    expect(fixture.componentInstance.slowLoad()).toBe(false);
    expect(element.querySelector('.loading')).toBeNull();
  });

  it('never shows the slow-load hint if the products arrive quickly', () => {
    response$.next(emptyPage);
    vi.advanceTimersByTime(5000);
    fixture.detectChanges();

    expect(fixture.componentInstance.slowLoad()).toBe(false);
    expect(element.querySelector('.loading-hint')).toBeNull();
  });

  it('shows the empty state when there are no products', () => {
    response$.next(emptyPage);
    fixture.detectChanges();

    expect(fixture.componentInstance.loading()).toBe(false);
    expect(element.querySelector('.empty-title')?.textContent).toContain('No products yet.');
    expect(element.querySelector('.empty-hint')?.textContent).toContain('Check back soon');
    expect(element.querySelector('.grid')).toBeNull();
  });
});
