# Blind Spot — Dossier

> *The tutor that reveals what you have not seen yet.*
> Hackathon CEFIS · 26 Mai 2026

---

## Visão do Produto

**Nome:** Blind Spot
**Tagline:** *"The tutor that reveals what you have not seen yet."*
**Lema:** *"Você ainda não sabe o que não sabe."*

O tutor não é um buscador de cursos com IA — é um **revelador de blind spots**. O diferencial não é a recomendação, é o diagnóstico. O aluno chega achando que sabe o que precisa aprender. O Blind Spot mostra o que ele não viu.

**Foco absoluto no resultado do aluno:** máximo aprendizado no menor tempo possível, da forma mais eficiente, gerando o maior senso de conquista.

**Universalidade:** funciona para qualquer pessoa — independente de idade, língua, background educacional ou necessidade. Agnóstico ao aluno.

---

## O Desafio

Construir um **tutor de IA personalizado** integrado ao catálogo real da CEFIS, em 1 dia. Prêmio R$10.000.

> "Um tutor que verdadeiramente conhece o aluno — entende o que ele já domina, sabe onde quer chegar, e traça o caminho mais inteligente para lá."

---

## Fluxo Macro

```
Entrada → Inferência Silenciosa → Chat de Conexão → Mini-Quiz →
Escolha de Persona → Revelação do DNA → Diagnóstico de Blind Spots →
Plano Personalizado → Loop de Estudo com Dopamina
```

---

## Onboarding — DNA de Aprendizado

### Filosofia

O onboarding não é coleta de dados — é o primeiro momento de transformação.

O aluno precisa sair sentindo:
- **"Esse tutor me entende"** — viu coisas que nenhum outro viu
- **"Eu consigo"** — o plano parece alcançável, não assustador
- **"Quero começar agora"** — urgência positiva, não ansiedade

Toda pergunta serve um propósito duplo: coletar dado **e** fazer o aluno refletir sobre si mesmo.

---

### Fase 1 — Inferência Silenciosa (algoritmo, zero LLM)

Ao receber a primeira mensagem, antes de qualquer resposta:

| Sinal | O que extrai | Como |
|-------|-------------|------|
| Idioma da mensagem | Língua de toda a conversa | `franc` (biblioteca JS) |
| Complexidade do vocabulário | Nível educacional aproximado | Flesch-Kincaid + listas CEFR |
| Tom formal/casual | Como o tutor deve responder | Heurística de pontuação |
| Framing do objetivo | Urgência + contexto (carreira/curiosidade/academia) | Palavras-chave |
| Tamanho da resposta | Tolerância a conteúdo denso | Contagem de caracteres |

O aluno nunca sabe que está sendo lido. O tutor já fala a língua dele desde a primeira resposta.

---

### Fase 2 — Chat de Conexão (LLM)

3 perguntas abertas. Tom: mentor curioso, não formulário.

**P1 — O objetivo real:**
> *"O que você quer alcançar? Seja específico — não precisa ser modesto."*

Extrai: domínio, ambição, urgência.

**P2 — O horizonte:**
> *"Em quanto tempo você quer chegar lá? Seja honesto, não otimista."*

Extrai: deadline real, pressão, contexto.

**P3 — O obstáculo histórico:**
> *"O que já te impediu de aprender isso antes?"*

Extrai: padrão de sabotagem, motivação intrínseca vs. extrínseca.

*Este é o dado mais valioso — o plano é estruturado para contornar o obstáculo declarado.*

---

### Fase 3 — Mini-Quiz de Calibração (5 cards visuais)

Cartão flutuante sobre o chat. Rápido, visual, não parece teste.

| # | Pergunta | Opções | Resolve com |
|---|----------|--------|------------|
| 1 | Tempo por dia disponível | 10 / 20 / 30 / 60 min | Algoritmo |
| 2 | Como aprende melhor | Exemplos / Leitura / Prática / Ouvindo | Algoritmo |
| 3 | Ritmo preferido | Sessões curtas / Mergulhos longos | Algoritmo |
| 4 | Nível de desafio | Desafiado no limite / No meu ritmo | Algoritmo |
| 5 | 2-3 perguntas de domínio | Específicas ao tema declarado | LLM gera + algoritmo score |

---

### Fase 4 — Escolha de Persona

Após o quiz, antes da revelação. 3 cards visuais:

| Persona | EN | Essência |
|---------|-----|----------|
| **Direto** | Sharp | Sem rodeios, eficiente, vai ao ponto |
| **Encorajador** | Coach | Celebra progresso, cria segurança |
| **Socrático** | Guide | Pergunta antes de responder |

**Fórmula:** Persona (escolhida) × Perfil (inferido) = Voz única para cada aluno.

---

### Fase 5 — Revelação do DNA de Aprendizado (Claude Haiku)

Tom: revelação, não relatório.

> *"Você é um **Explorador Prático** — absorve melhor através de exemplos concretos. Com 20 minutos por dia, em 3 semanas você pode dominar [X]. Você mencionou que falta de tempo sempre te parou — estruturei seu plano em blocos de 20 minutos. E tem uma coisa que você ainda não sabe que não sabe..."*

**DNA Types:**

| Perfil | Características | Adaptação do Plano |
|--------|----------------|-------------------|
| Explorador Prático | Aprende fazendo, exemplos reais | Casos de uso antes da teoria |
| Absorvedor Visual | Retém com diagramas, vídeos | Prioriza vídeos CEFIS |
| Construtor Metódico | Precisa de estrutura, passo a passo | Trilha linear, sem pular etapas |
| Conector Conceitual | Busca o "porquê" antes do "como" | Contexto antes do detalhe |
| Sprint Intenso | Foco alto por curto período | Sessões curtas, alta variedade |

---

### Perfil Universal do Aprendiz (JSON persistente)

Passado como contexto em **todas** as chamadas à IA.

```json
{
  "language": "pt-BR | en",
  "communication_style": "formal | casual | technical | simple",
  "age_proxy": "young | adult | senior",
  "background_level": "novice | intermediate | expert",
  "urgency": "immediate | medium-term | exploratory",
  "motivation_type": "career | curiosity | academic | survival",
  "obstacle": "o que impediu antes",
  "objetivo": "o que quer alcançar",
  "prazo": "quando quer chegar lá",
  "tempo_diario": 10,
  "estilo": "visual | leitura | pratica | auditivo",
  "ritmo": "sprints | imersao",
  "nivel_desafio": "desafiado | confortavel",
  "persona": "direto | encorajador | socratico",
  "dna_type": "explorador | absorvedor | construtor | conector | sprint",
  "baseline_score": 0,
  "gaps_identificados": [],
  "cursos_recomendados": []
}
```

---

## Universalidade — O Tutor Agnóstico

### 4 Eixos de Adaptação

**1. Idioma (PT-BR + EN)**
Detecção automática. A conversa acontece no idioma do aluno. Conteúdo CEFIS mediado:
- Query traduzida para PT → busca nas transcrições → resposta no idioma do aluno
- Síntese de cursos gerada no idioma do aluno
- Diferencial: conteúdo CEFIS acessível para não-falantes de português

**2. Nível**
Inferido por Flesch-Kincaid + vocabulário da primeira mensagem. Quiz adapta dificuldade ao nível inferido.

**3. Contexto de vida**
Tempo disponível, urgência, motivação — o plano é calibrado para a vida real, não para o ideal.

**4. Motivação**
Conquista (desejo de crescer) vs. evitar falhas → tom diferente do tutor para cada arquétipo.

---

## Motor vs. Voz — O que é Algoritmo, o que é LLM

```
Motor (algoritmo) = infraestrutura confiável, rápida, zero custo por operação
Voz  (LLM)       = tudo que o aluno lê ou ouve
```

### Resolve com Algoritmo (sem LLM)

| Função | Tecnologia |
|--------|-----------|
| Detecção de idioma | `franc` |
| Análise de vocabulário / nível | Flesch-Kincaid |
| Busca no catálogo CEFIS | BM25/TF-IDF sobre metadados |
| Sequenciamento do plano | Ordenação topológica (grafo de dependências) |
| Cálculo de cronograma | Aritmética pura |
| Scoring do quiz | Chave de respostas determinística |
| Progresso e estado do aluno | Máquina de estados no Redis |
| Chunking das transcrições | String manipulation |
| Busca vetorial (retrieval) | Qdrant cosine similarity |
| Cache das APIs CEFIS | Redis TTL |
| Render HyperFrames | FFmpeg + Puppeteer determinístico |

### Precisa de LLM

| Função | Modelo | Razão |
|--------|--------|-------|
| Compreender a primeira mensagem | DeepSeek V3 | NLU contextual real |
| Gerar perguntas de domínio do quiz | DeepSeek V3 | Geração contextual |
| Análise de gaps / blind spots | DeepSeek R1 | Raciocínio profundo |
| Geração do plano de estudos | DeepSeek R1 | Lógica de dependências |
| Síntese RAG (respostas contextuais) | DeepSeek V3 | Core do produto |
| Tradução de sínteses de conteúdo | DeepSeek V3 | Alta escala |
| Geração HTML para HyperFrames | DeepSeek V3 | Code generation |
| Conversa de onboarding | DeepSeek V3 | NLU + geração |
| Revelação do DNA / blind spots | Claude Haiku | Tom nuançado, momento emocional |
| Voz da persona escolhida | Claude Haiku | Qualidade de escrita crítica |

---

## Neurociência do Aprendizado

### Dopamina (antecipação + conquista)
- Cada sessão começa com **1 objetivo claro e alcançável** — o cérebro libera dopamina na antecipação
- Fim de cada aula: **checkpoint de 2 perguntas** — acerto = micro-animação de celebração
- O próximo conteúdo é sempre revelado ao terminar — loop de antecipação
- Nós da constelação: âmbar → verde conforme avança
- Cada sessão de 20min entrega **1 conceito completo dominado** — sensação de fechamento

### Serotonina (significado + reconhecimento)
- Fim de cada sessão: *"O que você aprendeu hoje que não sabia ontem?"*
- Tutor conecta cada aula ao objetivo original declarado
- A cada marco: *"Uma semana atrás você não sabia X. Hoje você sabe."*
- O plano tem nome e narrativa — jornada com destino, não lista de cursos

### Flow State
- Conteúdo calibrado para 85% de compreensão imediata
- Sessões de máximo 25 minutos
- Cada sessão: 1 objetivo, 1 conceito, 1 aplicação

---

## UI/UX — Brief para Stitch

### Conceito: "Emergence" (Emergência)

**Metáfora central:** conhecimento emergindo da escuridão.

A UI começa escura, quase vazia — espelhando o lema. À medida que o aluno fala, o mundo ao redor se ilumina.

### Paleta e Mood

- **Fundo:** `#0A0C14` (azul-marinho profundo)
- **Conhecimento:** `#F5A623` (âmbar dourado) — revela blind spots
- **Texto principal:** `#F0F0F5`
- **Texto secundário:** `#8A8FA8`
- **Progresso:** `#34C785` (verde esmeralda)
- **Mood:** Premium, íntimo, inteligente. Referências: Linear, Arc Browser, Claude.ai

### Tipografia
- UI: Inter ou Plus Jakarta Sans
- Voz do tutor: ligeiramente maior, espaçamento generoso — mentor, não chatbot

### 6 Telas

**1. Landing** — Tela escura. Uma linha: *"O que você quer alcançar?"* Cursor piscando. Nenhum botão, nenhum menu.

**2. Chat de Onboarding** — Chat minimalista. No fundo, constelação de nós sutilíssima aparece com cada resposta. O aluno não percebe o padrão ainda.

**3. Mini-Quiz** — Cartão flutuante com perguntas visuais. Após responder, dissolve e o chat continua.

**4. Revelação dos Blind Spots** — Nós específicos pulsam em âmbar dourado enquanto o tutor revela os gaps. O aluno percebe que o fundo era o mapa dele sendo construído.

**5. Plano de Estudos** — Constelação se reorganiza em trilha linear luminosa. Cada nó = um curso. Hover expande com nome, duração e contexto.

**6. Modo de Estudo** — Constelação reduzida no canto como mapa pessoal. Nós ficam verdes conforme avança. Chat sempre acessível via botão flutuante.

### Animações

| Momento | Animação |
|---------|----------|
| Usuário digita | Nós aparecem suavemente no fundo |
| Blind spot revelado | Nó âmbar pulsa uma vez |
| Plano gerado | Constelação flui para trilha linear (500ms ease) |
| Curso concluído | Nó verde com micro-ripple |

### O que NÃO deve ter
Dashboards, barra de progresso percentual, badges, streaks, menus complexos, qualquer coisa que pareça um LMS.

---

## HyperFrames — Reframing de Conteúdo

**Repo:** `github.com/heygen-com/hyperframes`
**Conceito:** Write HTML. Render video. Built for agents.

Transcrições CEFIS → micro-vídeos personalizados gerados em tempo real, no idioma do aluno.

### Pipeline
```
Transcrição CEFIS → Claude extrai conceito-chave →
DeepSeek V3 gera HTML composition (HyperFrames) →
Worker renderiza MP4 → exibido inline no chat
```

### Momentos de Uso

| Quando | Conteúdo do vídeo | Duração |
|--------|------------------|---------|
| Fim do onboarding | DNA de Aprendizado revelado visualmente | 20s |
| Início de cada sessão | Contexto do conceito do dia | 30s |
| Fim de sessão | Resumo animado do que foi aprendido | 20s |
| Revelação de blind spot | Gap + posição na jornada | 15s |

### Stack técnica
`@hyperframes/producer`, Node.js ≥ 22, FFmpeg, Puppeteer — container Docker dedicado.

---

## Voice AI

### TTS — ElevenLabs
Cada persona tem uma voz com caráter distinto:
- **Direto (Sharp):** clara, ritmo rápido, sem pausas longas
- **Encorajador (Coach):** calorosa, ritmo médio, pausas empáticas
- **Socrático (Guide):** reflexiva, pausas deliberadas, entonação questionadora

### STT — Web Speech API
Nativo do browser. Zero dependência externa, zero custo.

### Modo de Uso
Toggle único para alternar texto ↔ voz a qualquer momento. No modo voz: aluno fala → tutor responde por áudio + texto simultâneo.

---

## Stack Técnica

| Camada | Tecnologia | Razão |
|--------|-----------|-------|
| Framework | Next.js 15 (App Router) | SSR + streaming nativo |
| Proxy | **Caddy** | HTTPS automático, config mínima |
| AI principal | **DeepSeek V3** | ~$0.27/M tokens, 90% das operações |
| AI raciocínio | **DeepSeek R1** | Gap analysis + plano de estudos |
| AI escrita/UX | **Claude Haiku** | Momentos emocionais críticos |
| Vector DB | **Qdrant** (Docker) | RAG local, zero custo por query |
| Cache / Estado | **Redis** (Docker) | Cache CEFIS + estado de sessão |
| Video | **HyperFrames** worker (Docker) | Micro-vídeos personalizados |
| Voice TTS | **ElevenLabs** | Voz por persona |
| Voice STT | **Web Speech API** | Nativo, zero custo |
| Estilo | Tailwind CSS + shadcn/ui | Velocidade de build |
| Containerização | **Docker Compose** | VPS com root access |

---

## Infraestrutura Docker

```
VPS (root access)
└── Docker Compose
    ├── caddy          → Proxy + HTTPS automático (Let's Encrypt)
    ├── app            → Next.js porta 3000
    ├── hyperframes    → Worker de renderização de vídeo
    ├── qdrant         → Vector DB para RAG
    └── redis          → Cache + estado de sessão
```

**Vantagens vs. Serverless:**
- HyperFrames sem restrição (FFmpeg + Puppeteer nativos)
- Qdrant local (zero custo por query)
- Redis local (sem billing por operação)
- Workers de background sem timeout
- Indexação das transcrições no boot

---

## APIs CEFIS

**Auth:** `POST https://cefis.com.br/api/v1/login` → API Key (sem expiração)
**Header:** `Authorization: Bearer [api_key]`

| Endpoint | Base | Uso no produto |
|----------|------|---------------|
| `POST /api/v1/login` | cefis.com.br | Autenticação |
| `GET /api/v1/user/me` | cefis.com.br | Perfil do aluno |
| `GET /courses` | api-v3.cefis.com.br | Índice para BM25 |
| `GET /courses/:id` | api-v3.cefis.com.br | Detalhes para RAG |
| `GET /courses/:id/lessons` | api-v3.cefis.com.br | Aulas + transcrições |
| `GET /tracks` | api-v3.cefis.com.br | Trilhas para sequenciamento |
| `GET /tracks/:id` | api-v3.cefis.com.br | Dependências de conhecimento |
| `GET /performance/certificates` | api-v3.cefis.com.br | Estado atual do aluno |

**Transcrições:** ZIP com JSONs por aula → indexados no Qdrant no boot do container.

---

## Critérios de Avaliação — Como Maximizamos

| Critério | Peso | Nossa Estratégia |
|----------|------|-----------------|
| Funcionalidade | 30 pts | Fluxo completo end-to-end sem crashes |
| Integração CEFIS | 25 pts | RAG sobre transcrições + cursos reais no plano + multilíngue |
| Qualidade da IA | 20 pts | DeepSeek R1 para raciocínio + perfil persistente em todas as chamadas |
| Inovação | 15 pts | HyperFrames + Voice mode + Motor vs. Voz + universalidade |
| UX | 10 pts | Conceito Emergence + animações + zero formulários |

---

## Decisões Tomadas

| Decisão | Escolha | Razão |
|---------|---------|-------|
| Onboarding | Inferência silenciosa + chat + mini-quiz | Máxima precisão sem fricção |
| Revelação dos gaps | Progressiva no chat | Natural, alinhado com tom de mentor |
| UX concept | "Emergence" — constelação emergindo da escuridão | Espelha o lema; momento "aha" garantido |
| Voz do tutor | 3 personas × perfil inferido | Agência do aluno + adaptação automática |
| Idiomas | PT-BR + EN, detecção automática | Diferencial de mercado |
| AI strategy | Mix: DeepSeek V3 + R1 + Claude Haiku | Custo otimizado; LLM só onde necessário |
| Video | HyperFrames | Reframing de conteúdo sem custo por render |
| Voice | ElevenLabs TTS + Web Speech API | Simples, robusto, custo controlado |
| Proxy | Caddy | HTTPS automático, config mínima |
| Deploy | VPS + Docker Compose | Sem restrições de serverless |
| Arquitetura core | Motor (algoritmo) + Voz (LLM) | Confiabilidade + custo controlado |

---

## Requisitos de Entrega

- Protótipo **deployado online** no VPS
- Código em **repositório público no GitHub**
- Deadline: **26 Mai 2026, 23h59 EST-4**
- Código desenvolvido **no dia**
