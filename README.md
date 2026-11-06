# Organizador de Estudos — Engenharia de Computação Unicamp (AA)

App local (HTML + CSS + JavaScript puro, sem instalação) para organizar o curso.

## Como abrir

Opção 1 — dar dois cliques em `index.html`.

Opção 2 (recomendada, endereço fixo):

```bash
cd ~/AppOrganizador && python3 -m http.server 8765
```

e abrir http://localhost:8765

> Os dados ficam no `localStorage` do navegador. Use **Backup e config. → Exportar** com frequência
> e **Importar** para levar os dados a outro computador/navegador. Abrir por `file://` e por
> `localhost` usa armazenamentos diferentes — escolha uma forma e mantenha.

## O que tem

| Tela | Conteúdo |
|---|---|
| **Painel** | Progresso em créditos, hábitos de hoje, próximos 21 dias de provas/entregas, situação das matérias do semestre atual |
| **Grade curricular** | Grade oficial do curso 34, modalidade AA (Catálogo 2024 da DAC), com ementa, pré-requisitos, exame e frequência de cada disciplina, por semestre sugerido; clique para marcar pendente → cursando → aprovada; controle dos 4 grupos de eletivas (49 créditos) e das **360 h de extensão** (10% de 240 créditos) |
| **Semestres e matérias** | Crie semestres (pode preencher com o semestre da proposta). Cada matéria tem: |
| | • **Por que estudo isso?** — por quê, como me torna melhor, onde aplico, quem criou e por quê, retorno financeiro, com referências |
| | • **Notas e média** — fórmula do PDD (com `min`, `max`, `se(...)` etc.), média para passar, frequência, exame; calcula quanto você precisa nas notas que faltam |
| | • **Cronograma** — aulas, provas, listas e entregas com datas (ou gerar semanas automaticamente) |
| | • **PDD** — link e texto do Plano de Desenvolvimento da Disciplina, tópicos |
| | • **Bibliografia** — sugestões priorizando livros com muitos exercícios resolvidos (Schaum etc.) |
| | • **Prompts de IA** — modelos que exigem resolução direta, contextualizada (texto antes da conta), procedural e sem decoreba |
| | • **Anotações** |
| **Objetivos** | Hábitos diários (com sequência), metas semanais, mensais, anuais, profissionais e de vida, com passos e progresso |

## Exemplos de fórmula de média

```
(P1 + P2) / 2
0.35*P1 + 0.35*P2 + 0.3*L
se(min(P1,P2) >= 3, 0.4*P1 + 0.4*P2 + 0.2*L, min(P1,P2))
media(L1, L2, L3, L4) * 0.2 + 0.8 * (P1 + 2*P2) / 3
```

Deixe em branco as notas que ainda não saíram: o app encontra o menor valor necessário
(se houver várias em branco, assume o mesmo valor em todas e mostra uma tabela de cenários).

## Fontes da grade

- https://www.dac.unicamp.br/sistemas/catalogos/grad/catalogo2024/cursos/34g/sugestao.html
- https://www.dac.unicamp.br/sistemas/catalogos/grad/catalogo2024/cursos/34g/curriculo.html

## Estrutura

```
index.html
css/style.css
js/data-curriculo.js   grade oficial + regra de extensão (editar aqui se o catálogo mudar)
js/data-catalogo.js    ementa, pré-requisitos, exame, frequência e horas de extensão por disciplina
manifest.webmanifest, sw.js, icons/   instalação no Android e uso offline (PWA)
js/data-conteudo.js    bibliografia + motivação + referências por disciplina
js/expr.js             avaliador seguro de fórmulas (sem eval)
js/app.js              telas e lógica
```
