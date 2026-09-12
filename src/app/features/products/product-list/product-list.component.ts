import { Component, OnInit, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
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
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    MatTooltipModule
  ],
  templateUrl: './product-list.component.html',
  styleUrl: './product-list.component.scss'
})
export class ProductListComponent implements OnInit {
  readonly products = signal<Product[]>([]);
  readonly loading = signal(true);
  readonly totalCount = signal(0);
  readonly pageSize = signal(9);
  readonly pageIndex = signal(0);
  readonly generatingId = signal<string | null>(null);

  constructor(
    private productService: ProductService,
    public authService: AuthService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.productService.getAll(this.pageIndex() + 1, this.pageSize()).subscribe({
      next: (result) => {
        this.products.set(result.items);
        this.totalCount.set(result.totalCount);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.snackBar.open('No se pudieron cargar los productos.', 'Cerrar', { duration: 4000 });
      }
    });
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
          this.snackBar.open('Producto creado.', 'Cerrar', { duration: 3000 });
          this.load();
        },
        error: () => this.snackBar.open('No se pudo crear el producto.', 'Cerrar', { duration: 4000 })
      });
    });
  }

  openEditDialog(product: Product): void {
    const ref = this.dialog.open(ProductFormComponent, { data: { product } });

    ref.afterClosed().subscribe((result: ProductFormResult | undefined) => {
      if (!result) return;

      this.productService.update({ id: product.id, ...result }).subscribe({
        next: () => {
          this.snackBar.open('Producto actualizado.', 'Cerrar', { duration: 3000 });
          this.load();
        },
        error: () => this.snackBar.open('No se pudo actualizar el producto.', 'Cerrar', { duration: 4000 })
      });
    });
  }

  deleteProduct(product: Product): void {
    if (!confirm(`¿Eliminar "${product.name}"?`)) return;

    this.productService.delete(product.id).subscribe({
      next: () => {
        this.snackBar.open('Producto eliminado.', 'Cerrar', { duration: 3000 });
        this.load();
      },
      error: () => this.snackBar.open('No se pudo eliminar el producto.', 'Cerrar', { duration: 4000 })
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
        this.snackBar.open('No se pudo generar la descripción.', 'Cerrar', { duration: 4000 });
      }
    });
  }
}
