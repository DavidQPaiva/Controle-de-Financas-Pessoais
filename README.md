# Finance App

Aplicativo Android de gestão financeira pessoal com foco em **projeção de fluxo de caixa** e **controle de cartões de crédito parcelados**. Funciona 100% offline (local-first com SQLite).

## Principais funcionalidades

- **Dashboard** com saldo livre, percentual de comprometimento da renda e status saudável/crítico (gatilho em 80%).
- **Lançamento de transações** (receitas e despesas) com categorias customizáveis.
- **Cartões de crédito** com regra real de fechamento/vencimento: compras após o fechamento caem na fatura do mês seguinte.
- **Parcelamento automático**: uma compra em N parcelas gera N transações com datas de vencimento corretas.
- **Extrato mensal** com totais de entradas, saídas e saldo do mês.
- **Navegação entre meses** para visualizar histórico e projeções futuras.
- **CRUD completo** de categorias (com seletor de cor e ícone) e cartões.
- Interface em **português brasileiro** com tema escuro.

## Stack

| Camada | Tecnologia |
|---|---|
| Runtime | Expo SDK 54, React Native 0.81, React 19 |
| Linguagem | TypeScript |
| Navegação | Expo Router (file-based) |
| Banco de dados | expo-sqlite (local) |
| Estado global | Zustand |
| Estilização | NativeWind 4 + Tailwind CSS 3 |
| Datas | date-fns |
| Ícones | @expo/vector-icons (Ionicons) |

## Estrutura do projeto

```
app/                  Rotas (Expo Router)
  (tabs)/             Tabs: Dashboard, Adicionar, Extrato, Configurações
  categories.tsx      Modal de gerenciamento de categorias
  credit-cards.tsx    Modal de gerenciamento de cartões
components/           Componentes compartilhados (MonthSelector)
database/             Schema SQLite + CRUD (categories, creditCards, transactions)
store/                Zustand store (mês selecionado)
utils/                Lógica de fatura, formatação de moeda e datas
assets/               Ícones e splash
```

## Como rodar

> Pré-requisito: Node.js 20+ e Android Studio (ou um device Android com Expo Go).

```bash
# 1. Instalar dependências (o --legacy-peer-deps é necessário por conflito de peer com react-dom)
npm install --legacy-peer-deps

# 2. Iniciar o Metro bundler
npm start

# 3. Em outro terminal, rodar no Android
npm run android
```

Na primeira execução o app cria o banco SQLite local e popula categorias-padrão em PT-BR.

## Regras de negócio principais

### Data efetiva da fatura do cartão

```
seFechamento = vencimento - diasParaFechamento
se compra <= seFechamento → cai na fatura do mês atual (vence neste mês)
caso contrário              → cai na fatura do mês seguinte
```

Implementação: [utils/creditCardUtils.ts](utils/creditCardUtils.ts) — `getInvoiceDueDate`.

### Comprometimento da renda

```
totalGeral       = parcelas + outrasDespesas
comprometimento  = (totalGeral / receitas) * 100
saldoLivre       = receitas - totalGeral
crítico          = comprometimento >= 80%
```

Implementação: [app/(tabs)/index.tsx](app/%28tabs%29/index.tsx) — `computeProjections`.

## Paleta (tema escuro)

| Token | Hex |
|---|---|
| bg | `#0f0f23` |
| surface | `#1a1a35` |
| card | `#24243d` |
| border | `#2d2d50` |
| primary | `#6366f1` |
| income | `#22c55e` |
| expense | `#ef4444` |

## Scripts

| Comando | Descrição |
|---|---|
| `npm start` | Inicia o Metro bundler |
| `npm run android` | Compila e instala no Android |
| `npm run ios` | Compila no iOS (não testado/oficialmente suportado) |
| `npm run web` | Inicia versão web (parcial) |
