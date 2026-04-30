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

  get currentRecommendationLabel(): string {
    if (!this.ref || !this.usdt) {
      return 'USD referencial';
    }

    const refSell = this.ref.cotizacion;
    const usdtBuy = this.usdt.purchase > 0 ? this.usdt.purchase : this.usdt.cotizacion;
    return usdtBuy < refSell ? 'USDT' : 'Precio venta USD referencial';
  }

  get recommendationReasons(): string[] {
    if (!this.ref || !this.usdt) {
      return ['Espera a que se carguen los precios USD referencial y USDT para recibir una recomendación precisa.'];
    }

    const refSell = this.ref.cotizacion;
    const usdtBuy = this.usdt.purchase > 0 ? this.usdt.purchase : this.usdt.cotizacion;
    const reasons = [
      `Precio compra de USDT: ${usdtBuy.toFixed(2)} BOB.`,
      `Precio venta USD referencial: ${refSell.toFixed(2)} BOB.`,
    ];

    if (usdtBuy < refSell) {
      reasons.push('USDT está más barato, por eso conviene pagar con USDT.');
    } else if (usdtBuy > refSell) {
      reasons.push('El dólar referencial está más barato, por eso conviene pagar con precio venta USD referencial.');
    } else {
      reasons.push('Los precios están igualados; por seguridad se recomienda precio venta USD referencial.');
    }

    return reasons;
  }
}
