import { PrismaClient } from '@prisma/client'
import { ExchangeRateResult } from '../types/payment'
import { createModuleLogger } from '../utils/logger'

const logger = createModuleLogger('FiatCryptoService')

const prisma = new PrismaClient()

export class FiatCryptoService {
  /**
   * Get current exchange rate for fiat to crypto conversion
   */
  async getExchangeRate(
    fiatCurrency: string,
    cryptoCurrency: string
  ): Promise<ExchangeRateResult> {
    try {
      // First, check cache for valid exchange rate
      const cached = await prisma.exchangeRate.findFirst({
        where: {
          fiatCurrency: fiatCurrency.toUpperCase(),
          cryptoCurrency: cryptoCurrency.toUpperCase(),
          isActive: true,
          validUntil: {
            gt: new Date(),
          },
        },
      })

      if (cached) {
        return {
          fiatCurrency: cached.fiatCurrency,
          cryptoCurrency: cached.cryptoCurrency,
          rate: cached.rate,
          source: cached.source,
          validUntil: cached.validUntil,
        }
      }

      // Fetch fresh rate from Stellar DEX or external API
      const rate = await this.fetchExchangeRate(fiatCurrency, cryptoCurrency)

      // Cache the rate
      const exchangeRate = await prisma.exchangeRate.upsert({
        where: {
          fiatCurrency_cryptoCurrency_source: {
            fiatCurrency: fiatCurrency.toUpperCase(),
            cryptoCurrency: cryptoCurrency.toUpperCase(),
            source: 'COIN_GECKO',
          },
        },
        create: {
          fiatCurrency: fiatCurrency.toUpperCase(),
          cryptoCurrency: cryptoCurrency.toUpperCase(),
          rate: rate.rate,
          source: rate.source,
          validUntil: new Date(Date.now() + 5 * 60 * 1000), // Valid for 5 minutes
          isActive: true,
        },
        update: {
          rate: rate.rate,
          validUntil: new Date(Date.now() + 5 * 60 * 1000),
          updatedAt: new Date(),
        },
      })

      logger.info('Exchange rate fetched and cached', {
        fiatCurrency,
        cryptoCurrency,
        rate: exchangeRate.rate,
      })

      return {
        fiatCurrency: exchangeRate.fiatCurrency,
        cryptoCurrency: exchangeRate.cryptoCurrency,
        rate: exchangeRate.rate,
        source: exchangeRate.source,
        validUntil: exchangeRate.validUntil,
      }
    } catch (error: any) {
      logger.error('Failed to get exchange rate', {
        error: error.message,
        fiatCurrency,
        cryptoCurrency,
      })
      throw new Error(`Failed to get exchange rate: ${error.message}`)
    }
  }

  /**
   * Convert fiat amount to crypto amount
   */
  async convertFiatToCrypto(
    fiatAmount: number, // in smallest unit (e.g., cents)
    fiatCurrency: string,
    cryptoCurrency: string
  ): Promise<number> {
    try {
      const exchangeRate = await this.getExchangeRate(fiatCurrency, cryptoCurrency)

      // Convert from smallest unit to base unit
      const fiatInBaseUnit = fiatAmount / 100

      // Calculate crypto amount
      const cryptoAmount = fiatInBaseUnit * exchangeRate.rate

      logger.info('Fiat to crypto conversion', {
        fiatAmount: fiatInBaseUnit,
        fiatCurrency,
        cryptoAmount,
        cryptoCurrency,
        rate: exchangeRate.rate,
      })

      return cryptoAmount
    } catch (error: any) {
      logger.error('Failed to convert fiat to crypto', {
        error: error.message,
        fiatAmount,
        fiatCurrency,
        cryptoCurrency,
      })
      throw error
    }
  }

  /**
   * Fetch exchange rate from external API
   */
  private async fetchExchangeRate(
    fiatCurrency: string,
    cryptoCurrency: string
  ): Promise<{ rate: number; source: string }> {
    try {
      // Try to fetch from CoinGecko API
      const cryptoId = this.getCryptoId(cryptoCurrency)
      const fiatId = this.getFiatId(fiatCurrency)

      const response = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${cryptoId}&vs_currencies=${fiatId}`
      )

      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.statusText}`)
      }

      const data = await response.json()
      const priceInFiat = data[cryptoId]?.[fiatId]

      if (!priceInFiat) {
        throw new Error(`Price not found for ${cryptoCurrency}/${fiatCurrency}`)
      }

      // Return inverse rate (1 fiat = X crypto)
      const rate = 1 / priceInFiat

      return {
        rate,
        source: 'COIN_GECKO',
      }
    } catch (error: any) {
      logger.warn('Failed to fetch from CoinGecko, using fallback', {
        error: error.message,
      })

      // Fallback to hardcoded rates for common pairs
      return this.getFallbackRate(fiatCurrency, cryptoCurrency)
    }
  }

  /**
   * Get fallback exchange rate for common pairs
   */
  private getFallbackRate(
    fiatCurrency: string,
    cryptoCurrency: string
  ): { rate: number; source: string } {
    const fiat = fiatCurrency.toUpperCase()
    const crypto = cryptoCurrency.toUpperCase()

    // Fallback rates (these should be updated regularly in production)
    const fallbackRates: Record<string, Record<string, number>> = {
      XLM: {
        USD: 8.33, // 1 USD = 8.33 XLM (example rate)
        EUR: 9.09,
        GBP: 10.53,
      },
      USDC: {
        USD: 1.0,
        EUR: 1.08,
        GBP: 1.27,
      },
    }

    const rate = fallbackRates[crypto]?.[fiat]

    if (!rate) {
      throw new Error(`No fallback rate available for ${fiat}/${crypto}`)
    }

    logger.info('Using fallback exchange rate', {
      fiatCurrency: fiat,
      cryptoCurrency: crypto,
      rate,
    })

    return {
      rate,
      source: 'MANUAL',
    }
  }

  /**
   * Get CoinGecko crypto ID
   */
  private getCryptoId(currency: string): string {
    const cryptoIds: Record<string, string> = {
      XLM: 'stellar',
      USDC: 'usd-coin',
      BTC: 'bitcoin',
      ETH: 'ethereum',
    }

    return cryptoIds[currency.toUpperCase()] || currency.toLowerCase()
  }

  /**
   * Get CoinGecko fiat ID
   */
  private getFiatId(currency: string): string {
    return currency.toLowerCase()
  }

  /**
   * Update exchange rates manually (for admin use)
   */
  async updateExchangeRate(
    fiatCurrency: string,
    cryptoCurrency: string,
    rate: number,
    validForHours: number = 24
  ): Promise<void> {
    try {
      await prisma.exchangeRate.upsert({
        where: {
          fiatCurrency_cryptoCurrency_source: {
            fiatCurrency: fiatCurrency.toUpperCase(),
            cryptoCurrency: cryptoCurrency.toUpperCase(),
            source: 'MANUAL',
          },
        },
        create: {
          fiatCurrency: fiatCurrency.toUpperCase(),
          cryptoCurrency: cryptoCurrency.toUpperCase(),
          rate,
          source: 'MANUAL',
          validUntil: new Date(Date.now() + validForHours * 60 * 60 * 1000),
          isActive: true,
        },
        update: {
          rate,
          validUntil: new Date(Date.now() + validForHours * 60 * 60 * 1000),
          updatedAt: new Date(),
        },
      })

      logger.info('Exchange rate updated manually', {
        fiatCurrency,
        cryptoCurrency,
        rate,
        validForHours,
      })
    } catch (error: any) {
      logger.error('Failed to update exchange rate', {
        error: error.message,
        fiatCurrency,
        cryptoCurrency,
      })
      throw error
    }
  }
}
