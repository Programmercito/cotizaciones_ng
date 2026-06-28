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
  @Input() oficial: Cotizacion | null = null;
  @Input() usdt: Cotizacion | null = null;

  get recommendationText(): string {
    if (!this.oficial || !this.usdt) {
      return 'La recomendación se genera cuando la aplicación carga el USD Oficial y el precio de USDT. Mantené la página actualizada para ver la comparación correcta en tiempo real.';
    }

    const oficialSell = this.oficial.cotizacion;
    const usdtBuy = this.usdt.purchase > 0 ? this.usdt.purchase : this.usdt.cotizacion;

    if (usdtBuy < oficialSell) {
      return `El precio compra de USDT es ${usdtBuy.toFixed(2)} BOB y el precio venta USD oficial es ${oficialSell.toFixed(2)} BOB. Hoy USDT está más barato, por lo que conviene pagar con USDT. Si ya tenés saldo en wallet, aprovechá esa posición; si no, considerá comprar USDT para tu compra internacional.`;
    }

    if (usdtBuy > oficialSell) {
      return `El precio venta USD oficial es ${oficialSell.toFixed(2)} BOB y el precio compra de USDT es ${usdtBuy.toFixed(2)} BOB. Hoy el dólar oficial está más barato, por lo que conviene pagar con precio venta USD oficial. Esta opción es más estable y puede ser la mejor alternativa cuando el USDT está más caro.`;
    }

    return `El precio compra de USDT y el precio venta USD oficial están igualados en ${oficialSell.toFixed(2)} BOB. En este caso es mejor usar el precio venta USD oficial por seguridad, porque el USDT puede tener microvariaciones en su paridad con el dólar.`;
  }

  get currentRecommendationLabel(): string {
    if (!this.oficial || !this.usdt) {
      return 'USD oficial';
    }

    const oficialSell = this.oficial.cotizacion;
    const usdtBuy = this.usdt.purchase > 0 ? this.usdt.purchase : this.usdt.cotizacion;
    return usdtBuy < oficialSell ? 'USDT' : 'Precio venta USD oficial';
  }

  get priceDiff(): { diff: number; winner: 'usdt' | 'oficial' | 'tie'; oficialSell: number; usdtBuy: number } | null {
    if (!this.oficial || !this.usdt) return null;
    const oficialSell = this.oficial.cotizacion;
    const usdtBuy = this.usdt.purchase > 0 ? this.usdt.purchase : this.usdt.cotizacion;
    const diff = Math.abs(oficialSell - usdtBuy);
    const winner: 'usdt' | 'oficial' | 'tie' = usdtBuy < oficialSell ? 'usdt' : usdtBuy > oficialSell ? 'oficial' : 'tie';
    return { diff, winner, oficialSell, usdtBuy };
  }

  get recommendationReasons(): string[] {
    if (!this.oficial || !this.usdt) {
      return ['Esperá a que se carguen los precios USD oficial y USDT para recibir una recomendación precisa.'];
    }

    const oficialSell = this.oficial.cotizacion;
    const usdtBuy = this.usdt.purchase > 0 ? this.usdt.purchase : this.usdt.cotizacion;
    const reasons = [
      `Precio compra de USDT: ${usdtBuy.toFixed(2)} BOB.`,
      `Precio venta USD oficial: ${oficialSell.toFixed(2)} BOB.`,
    ];

    if (usdtBuy < oficialSell) {
      reasons.push('USDT está más barato, por eso conviene pagar con USDT.');
    } else if (usdtBuy > oficialSell) {
      reasons.push('El dólar oficial está más barato, por eso conviene pagar con precio venta USD oficial.');
    } else {
      reasons.push('Los precios están igualados; por seguridad se recomienda precio venta USD oficial.');
    }

    return reasons;
  }
}
