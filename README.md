# ManMade (todos os arquivos na raiz)

Envie TODOS os arquivos desta pasta para a raiz do repositório (sem criar subpastas).

Páginas: index.html · login.html · cadastro.html · download.html
Estilos: global.css · home.css · auth.css
Scripts: firebase-config.js · auth.js · auth-pages.js · home.js · download.js
Imagens: background.png · cadastro.png · login.png · download.png · voltar.png
Banco: firestore.rules (cole no Firestore → Regras)

Preencha firebase-config.js com os dados do seu projeto Firebase.
Local: use Live Server ou `python -m http.server 5500` (não abra com duplo clique).

## Cadastro seguro

- `validators.js` define as regras de nome, e-mail e senha (8–64 caracteres, maiúscula, minúscula, número, símbolo, sem espaços, sem nome/e-mail na senha).
- O e-mail é validado no formato e o domínio é consultado por DNS (precisa existir e receber e-mail). Domínios inexistentes, com erro de digitação ou descartáveis são recusados. Não há código/link de confirmação.
- Limite: sem enviar uma mensagem, nenhum site consegue saber se a caixa específica existe (ex.: `joao@gmail.com` vs. `joaoo@gmail.com`).
- Recomendado: no console do Firebase → Authentication → Configurações → **Política de senha**, ative e marque os mesmos requisitos. Assim a regra vale no servidor, mesmo se alguém burlar o JavaScript do site.
