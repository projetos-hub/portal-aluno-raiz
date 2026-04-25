export interface TotvsResponse<T> {
  messages: Array<{ code: string; type: string; detail: string }>
  length: number
  data: T[] | null
}

export interface EduAluno {
  CODCOLIGADA: number
  CODFILIAL: number
  RA: string
  NOME: string
  CPF: string
  DTNASCIMENTO: string
  SEXO: string
  EMAIL: string
  FONE: string
  CODCURSO: string
  CODHABILITACAO: string
  CODGRADE: string
  CODPERIODO: string
  CODSERIE: string
  CODTURNO: string
  SITUACAO: string
}

export interface EduMatricula {
  CODCOLIGADA: number
  CODFILIAL: number
  RA: string
  CODPERIODO: string
  CODCURSO: string
  CODHABILITACAO: string
  CODGRADE: string
  CODSERIE: string
  CODTURNO: string
  SITUACAO: string       // ATIVO | CANCELADO | PENDENTE
  DTMATRICULA: string
  TIPOINGRESSO: string   // MATRICULA | REMATRICULA
}

export interface EduContrato {
  CODCOLIGADA: number
  CODFILIAL: number
  IDCONTRATO: number
  RA: string
  CODPERIODO: string
  VALORBRUTO: number       // normalized from VALORTOTAL in Sprint 7
  DESCONTO: number
  VALORFINAL: number
  QUANTIDADEPARCELAS: number  // normalized from NRPARCELAS in Sprint 7
  PRIMEIROVENCIMENTO: string  // normalized from DTPRIMEIROVCTO in Sprint 7
  FORMAPAGAMENTO: string // PIX | BOLETO | DEBITO
  SITUACAO: string
  CODRESPONSAVEL: number
  PARCELAS?: Parcela[]     // added in Sprint 7
}

export interface EduTurmaDisc {
  CODCOLIGADA: number
  CODFILIAL: number
  CODTURMA: string
  CODDISC: string
  NOMETURMA: string
  NOMEDISC: string
  NOMEPROFESSOR: string
  CARGAHORARIA: number
  CREDITOS: number
}

export interface EduColigada {
  CODCOLIGADA: number
  CODFILIAL: number
  NOME: string
}

export interface EduResponsavel {
  RESP_FINANCEIRO: string
  RESP_ACADEMICO: string
}

export interface Parcela {
  NR: number
  SERVICO: string
  VENCIMENTO: string
  VALOR_ORIGINAL: number
  VALOR_BOLSA: number
  VALOR_LIQUIDO: number
}

export interface AuthUser {
  id: string
  email: string
  codColigada: number
  codFilial: number
  alunosRA: readonly string[]
}
