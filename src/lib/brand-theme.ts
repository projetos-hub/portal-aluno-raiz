'use client'

import React from 'react'
import brandColorsRaw from '../../public/brand-colors.json'
import coligadasRaw from './totvs/mock/data/coligadas.json'

export interface BrandTheme {
  corPrimaria: string
  corSecundaria: string
  corTexto: string
  marca: string
  nomeEscola: string
  logoFile: string
  slug: string
}

interface BrandColorEntry {
  marca: string
  slug: string
  corPrimaria: string
  corSecundaria: string
  corTexto: string
  logoFile: string
  coligadas: Array<{ codColigada: number; codFilial: number; unidade: string }>
}

interface ColigadaFallbackEntry {
  CODCOLIGADA: number
  codColigada?: number
  nomeEscola: string
  marca: string
  corPrimaria: string
  corSecundaria: string
  logoUrl: string
}

const brandColors = brandColorsRaw as Record<string, BrandColorEntry>
const coligadas = coligadasRaw as ColigadaFallbackEntry[]

export function getBrandTheme(codColigada: number, codFilial?: number): BrandTheme {
  // Primary: brand-colors.json
  for (const entry of Object.values(brandColors)) {
    const match = codFilial !== undefined
      ? entry.coligadas.find(c => c.codColigada === codColigada && c.codFilial === codFilial)
      : entry.coligadas.find(c => c.codColigada === codColigada)

    if (match) {
      const nomeEscola = match.unidade
        ? `${entry.marca} — ${match.unidade}`
        : entry.marca

      return {
        corPrimaria: entry.corPrimaria,
        corSecundaria: entry.corSecundaria,
        corTexto: entry.corTexto,
        marca: entry.marca,
        nomeEscola,
        logoFile: entry.logoFile,
        slug: entry.slug,
      }
    }
  }

  // Fallback: coligadas.json (temporary — removed in Sprint 1.5)
  const col = coligadas.find(
    c => (c.CODCOLIGADA ?? c.codColigada) === codColigada,
  )
  if (col) {
    const logoFile = col.logoUrl.split('/').pop() ?? col.logoUrl
    return {
      corPrimaria: col.corPrimaria,
      corSecundaria: col.corSecundaria,
      corTexto: '#FFFFFF',
      marca: col.marca,
      nomeEscola: col.nomeEscola,
      logoFile,
      slug: col.marca.toLowerCase().replace(/\s+/g, '-'),
    }
  }

  throw new Error(
    `Marca não mapeada para codColigada ${codColigada}. Verifique brand-colors.json`,
  )
}

export const BrandThemeContext = React.createContext<BrandTheme | null>(null)

export function BrandThemeProvider({
  children,
  codColigada,
  codFilial,
}: {
  children: React.ReactNode
  codColigada: number
  codFilial?: number
}): React.JSX.Element {
  const theme = React.useMemo(
    () => getBrandTheme(codColigada, codFilial),
    [codColigada, codFilial],
  )
  return React.createElement(BrandThemeContext.Provider, { value: theme }, children)
}

export function useBrandTheme(): BrandTheme {
  const theme = React.useContext(BrandThemeContext)
  if (!theme) throw new Error('useBrandTheme deve ser usado dentro de BrandThemeProvider')
  return theme
}
