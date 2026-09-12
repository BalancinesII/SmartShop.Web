import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { Product } from '../../../core/models/product.model';

export interface ProductFormResult {
  name: string;
  price: number;
  stock: number;
  category: string;
}

@Component({
  selector: 'app-product-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule
  ],
  templateUrl: './product-form.component.html',
  styleUrl: './product-form.component.scss'
})
export class ProductFormComponent {
  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<ProductFormComponent, ProductFormResult>);
  data = inject<{ product?: Product }>(MAT_DIALOG_DATA);

  readonly isEdit = signal(!!this.data?.product);

  readonly form = this.fb.group({
    name: [this.data?.product?.name ?? '', [Validators.required, Validators.maxLength(200)]],
    price: [this.data?.product?.price ?? 0, [Validators.required, Validators.min(0.01)]],
    stock: [this.data?.product?.stock ?? 0, [Validators.required, Validators.min(0)]],
    category: [this.data?.product?.category ?? '', [Validators.required, Validators.maxLength(100)]]
  });

  submit(): void {
    if (this.form.invalid) return;
    this.dialogRef.close(this.form.getRawValue() as ProductFormResult);
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
