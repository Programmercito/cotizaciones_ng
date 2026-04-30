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
    const usdtBuy = this.usdt.purchase > 0 ? this.usdt.purchase : this.usdt.cotizacion;

    if (usdtBuy < refSell) {
      return `El precio compra de USDT es ${usdtBuy.toFixed(2)} BOB y el precio venta USD referencial es ${refSell.toFixed(2)} BOB. Hoy USDT está más barato, por lo que conviene pagar con USDT. Si ya tienes saldo en wallet, aprovecha esa posición; si no, considera comprar USDT para tu compra internacional.`;
    }

    if (usdtBuy > refSell) {
      return `El precio venta USD referencial es ${refSell.toFixed(2)} BOB y el precio compra de USDT es ${usdtBuy.toFixed(2)} BOB. Hoy el dólar referencial está más barato, por lo que conviene pagar con precio venta USD referencial. Esta opción es más estable y puede ser la mejor alternativa cuando el USDT está más caro.`;
    }

    return `El precio compra de USDT y el precio venta USD referencial están igualados en ${refSell.toFixed(2)} BOB. En este caso es mejor usar el precio venta USD referencial por seguridad, porque el USDT puede tener microvariaciones en su paridad con el dólar.`;
  }
}
