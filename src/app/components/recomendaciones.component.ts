import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Cotizacion } from '../models/cotizacion.model';

@Component({
  selector: 'app-recomendaciones',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './recomendaciones.component.html',
  styleUrls: ['./recomendaciones.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecomendacionesComponent {
  @Input() ref: Cotizacion | null = null;
  @Input() usdt: Cotizacion | null = null;

  get recommendationText(): string {
    if (!this.ref || !this.usdt) {
      return 'La recomendación se genera cuando la aplicación carga el USD Referencial y el precio de USDT. Mantén la página actualizada para ver la comparación correcta en tiempo real.';
    }

    const refSell = this.ref.cotizacion;
    const usdtSell = this.usdt.cotizacion;
    const usdtIsCheaper = usdtSell < refSell;

    const firstPart = usdtIsCheaper
      ? `El USD Referencial está a ${refSell.toFixed(2)} BOB y USDT se vende a ${usdtSell.toFixed(2)} BOB. Como 1 USDT equivale aproximadamente a 1 USD, la opción más eficiente es usar USDT si buscas el mejor precio en bolivianos.`
      : `El USD Referencial está a ${refSell.toFixed(2)} BOB y USDT se vende a ${usdtSell.toFixed(2)} BOB. Hoy el referencial es más barato, por lo que conviene pagar desde tu banco.`;

    const walletPart = usdtIsCheaper
      ? 'Si ya tienes saldo en tu wallet por una compra anterior o por otro medio, es recomendable aprovechar esa posición: tu USDT se vende más barato que el referencial.'
      : 'Si ya tienes USDT en la wallet, al venderlo a un precio mayor que el referencial conviene analizar bien si es mejor conservarlo o usar el referencial para la compra.';

    return `${firstPart} ${walletPart} En resumen: 1) Si tienes el dinero en el banco, usa el USD Referencial cuando sea más barato que USDT. 2) Si el referencial es más caro, usa USDT. 3) Si ya tienes wallet, decide según cuál precio de venta resulte más conveniente hoy.`;
  }
}
