import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ProductService } from '../../../core/services/product.service';
import { AuthService } from '../../../core/services/auth.service';
import { Product } from '../../../core/models/product.model';
import { ProductFormComponent, ProductFormResult } from '../product-form/product-form.component';

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [
    DecimalPipe,
    MatButtonModule,
    MatIconModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    MatTooltipModule
  ],
  templateUrl: './product-list.component.html',
  styleUrl: './product-list.component.scss'
})
export class ProductListComponent implements OnInit, OnDestroy {
  readonly products = signal<Product[]>([]);
  readonly loading = signal(true);
  readonly totalCount = signal(0);
  readonly pageSize = signal(9);
  readonly pageIndex = signal(0);
  readonly generatingId = signal<string | null>(null);

  // The demo API runs on free Azure tiers that sleep when idle, so the first
  // request can take a while. After a few seconds we tell the visitor why,
  // instead of leaving a spinner that looks broken.
  readonly slowLoad = signal(false);
  private slowLoadTimer?: ReturnType<typeof setTimeout>;
  private static readonly SLOW_LOAD_MS = 3000;

  constructor(
    private productService: ProductService,
    public authService: AuthService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.load();
  }

  ngOnDestroy(): void {
    this.clearSlowLoadTimer();
  }

  load(): void {
    this.loading.set(true);
    this.startSlowLoadTimer();
    this.productService.getAll(this.pageIndex() + 1, this.pageSize()).subscribe({
      next: (result) => {
        this.products.set(result.items);
        this.totalCount.set(result.totalCount);
        this.finishLoading();
      },
      error: () => {
        this.finishLoading();
        this.snackBar.open('Could not load products.', 'Dismiss', { duration: 4000 });
      }
    });
  }

  private finishLoading(): void {
    this.loading.set(false);
    this.clearSlowLoadTimer();
  }

  private startSlowLoadTimer(): void {
    this.clearSlowLoadTimer();
    this.slowLoadTimer = setTimeout(() => this.slowLoad.set(true), ProductListComponent.SLOW_LOAD_MS);
  }

  private clearSlowLoadTimer(): void {
    clearTimeout(this.slowLoadTimer);
    this.slowLoadTimer = undefined;
    this.slowLoad.set(false);
  }

  // Derive a stable hue from the product name so the placeholder colour is
  // consistent per product but varied across the catalog.
  colorFor(name: string): string {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash) % 360;
    return `${hue}`;
  }

  // If an image URL is broken, hide the <img> so the layout doesn't show a
  // broken-image icon. The placeholder isn't re-shown (URL was provided), but
  // the card stays clean.
  onImageError(event: Event): void {
    (event.target as HTMLImageElement).style.display = 'none';
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
    this.load();
  }

  openCreateDialog(): void {
    const ref = this.dialog.open(ProductFormComponent, { data: {} });

    ref.afterClosed().subscribe((result: ProductFormResult | undefined) => {
      if (!result) return;

      this.productService.create(result).subscribe({
        next: () => {
          this.snackBar.open('Product created.', 'Dismiss', { duration: 3000 });
          this.load();
        },
        error: () => this.snackBar.open('Could not create the product.', 'Dismiss', { duration: 4000 })
      });
    });
  }

  openEditDialog(product: Product): void {
    const ref = this.dialog.open(ProductFormComponent, { data: { product } });

    ref.afterClosed().subscribe((result: ProductFormResult | undefined) => {
      if (!result) return;

      this.productService.update({ id: product.id, ...result }).subscribe({
        next: () => {
          this.snackBar.open('Product updated.', 'Dismiss', { duration: 3000 });
          this.load();
        },
        error: () => this.snackBar.open('Could not update the product.', 'Dismiss', { duration: 4000 })
      });
    });
  }

  deleteProduct(product: Product): void {
    if (!confirm(`Delete "${product.name}"?`)) return;

    this.productService.delete(product.id).subscribe({
      next: () => {
        this.snackBar.open('Product deleted.', 'Dismiss', { duration: 3000 });
        this.load();
      },
      error: () => this.snackBar.open('Could not delete the product.', 'Dismiss', { duration: 4000 })
    });
  }

  generateDescription(product: Product): void {
    this.generatingId.set(product.id);

    this.productService.generateDescription(product.id).subscribe({
      next: (result) => {
        this.generatingId.set(null);
        this.products.update((list) =>
          list.map((p) => (p.id === product.id ? { ...p, description: result.description } : p))
        );
      },
      error: () => {
        this.generatingId.set(null);
        this.snackBar.open('Could not generate the description.', 'Dismiss', { duration: 4000 });
      }
    });
  }
}
