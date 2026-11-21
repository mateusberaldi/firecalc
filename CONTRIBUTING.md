# Como contribuir com o FireCalc

Obrigado pelo interesse. O FireCalc é usado para dimensionar sistemas de combate a incêndio, então cada mudança precisa de prova, principalmente quando mexe em número.

## Antes de começar

- Abra uma issue descrevendo o problema ou a ideia. Mudança de cálculo, de norma ou de dado de catálogo só entra com a fonte (norma com item, ou catálogo com página).
- Um pedido por vez. O mantenedor decide o escopo de cada versão.

## Regras do código

1. **Número do cálculo não muda por conta própria.** Os resultados dos casos de exemplo são conferidos pelo mantenedor a cada versão. Uma mudança de número precisa da fonte, de um gabarito feito de forma independente (planilha ou script), do antes e do depois nos exemplos e da aprovação do mantenedor.
2. **Todo código novo vem com a prova de que funciona**: o caso usado, o antes e o depois, e o que foi conferido no navegador.
3. **Textos da tela:** sem travessão, sem comentário pessoal e sem texto explicativo abaixo dos títulos. Norma citada só nas Verificações, na Ajuda e na tela Sobre.
4. **Dado de catálogo:** a fonte (documento e página) vai junto com o dado. Não envie PDFs de catálogo.
5. **Arquivos gerados** (`firecalc.html`, `v2/firecalc2.html`, `kit/`) saem dos scripts de montagem; não edite à mão.
6. **Cabeçalho de licença** em todo arquivo de código novo, igual ao dos arquivos existentes.

## Antes de enviar

Monte o programa e confira o seu caso no navegador:

```
bash montar.sh
```

Na descrição do pull request, diga o que mudou, por que e como conferiu. O mantenedor roda a conferência completa antes de incorporar.

## Licença da contribuição

O FireCalc é distribuído sob a GNU AGPL-3.0 (arquivo `LICENSE`), e o titular dos direitos é Mateus Beraldi Nobre. Para que o titular possa manter o projeto e, se for o caso, oferecer o FireCalc também sob licença comercial própria, toda contribuição de código segue estas condições:

1. Você declara que é o autor da contribuição ou que tem o direito de enviá-la, e que ela não traz código de terceiros sem a licença correspondente.
2. A contribuição é licenciada sob a AGPL-3.0, como o restante do projeto.
3. Além disso, você cede ao titular, de forma não exclusiva, mundial, perpétua e irrevogável, os direitos patrimoniais sobre a contribuição, com poder de usar, modificar, sublicenciar e distribuir sob qualquer licença, aberta ou comercial. Você continua sendo reconhecido como autor e os direitos morais de autoria são mantidos.

Para aceitar, termine cada commit com a linha `Signed-off-by: Seu Nome <seu@email>` (`git commit -s`). O nome e o e-mail dessa linha servem só para registrar a autoria e a cessão da contribuição, e ficam públicos e permanentes no histórico do repositório. Contribuição sem essa linha não será incorporada.

Quem não quiser ceder direitos pode contribuir com issues, relatos de erro e sugestões, que não têm essa condição.
