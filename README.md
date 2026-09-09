# Pedidos360 — Backend Serverless (AWS Lambda + API Gateway + DynamoDB)

Backend de la primera instancia de Pedidos360, desplegado con **Serverless
Framework** sobre una cuenta educativa de AWS (AWS Academy Learner Lab).

## 1. Qué incluye esta primera instancia

De los 5 microservicios de la tabla original, en esta etapa se implementan y
**despliegan** dos:

| Servicio | Exposición | Estado |
|---|---|---|
| `ms-pedidos360-orders` | `/api/orders/*` | ✅ Implementado (DynamoDB) |
| `ms-pedidos360-catalog` | `/api/catalog/*` | ✅ Implementado (DynamoDB) |
| `ms-pedidos360-notify` | consumidor RabbitMQ | ⏸️ Esqueleto en `src/functions/notify`, **no desplegado** |
| `ms-pedidos360-audit` | `/api/audit/*` (Kafka) | ⏸️ Esqueleto en `src/functions/audit`, **no desplegado** |
| `ms-pedidos360-report` | `/api/report/*` (Kafka) | ⏸️ Esqueleto en `src/functions/report`, **no desplegado** |

Se dejó el código de `notify`, `audit` y `report` como punto de partida, pero
no están referenciados en `serverless.yml` a propósito, tal como pediste
(nada de RabbitMQ ni Kafka funcional todavía).

### Diferencias respecto a la tabla original

- **Base de datos**: se usa **DynamoDB** en vez de Oracle (pay-per-request,
  sin servidores que administrar, encaja mejor con Lambda).
- **Coordinación de stock**: como `orders` y `catalog` viven en el mismo
  proyecto/cuenta, el descuento de stock al crear un pedido se hace con una
  transacción DynamoDB (`TransactWriteCommand`) en vez de mensajería. Si el
  stock no alcanza, toda la operación se cancela.
- **Notificación**: al no haber RabbitMQ, `createOrder` **no** dispara
  notificaciones todavía.

## 2. Arquitectura

```
Cliente React + MSAL
        │  (Bearer token de Azure Entra ID)
        ▼
   API Gateway (HTTP API)
        │  authorizer JWT nativo → valida contra Azure AD
        ▼
   AWS Lambda (Node.js 20)
        │
        ▼
     DynamoDB (2 tablas: orders, catalog)
```

La validación del JWT la hace **API Gateway directamente** (authorizer tipo
`jwt`), sin necesidad de una Lambda authorizer custom: Azure Entra ID expone
un endpoint de OpenID estándar y API Gateway sabe consumirlo. Esto es lo que
te da "API Gateway como capa de seguridad".

## 3. Requisitos previos

- Node.js 20+
- Cuenta de AWS Academy Learner Lab activa (o cualquier cuenta AWS)
- Cuenta de Azure con un tenant de Entra ID donde puedas registrar una app
- `npm install -g serverless` (opcional, también podés usar `npx serverless`)

## 4. Configuración de Azure Entra ID (paso importante)

MSAL, por defecto, saca tokens para Microsoft Graph — **no** sirven para
proteger tu propia API. Necesitás "exponer" tu API en Azure:

1. En **Azure Portal → App registrations**, registrá (o reusá) una app para
   el backend.
2. Andá a **Expose an API** → **Add a scope**. Azure te va a proponer un
   *Application ID URI* con la forma `api://<client-id>`. Aceptalo (o
   personalizalo) y creá un scope, por ejemplo `access_as_user`.
3. En la app registrada que usa tu **frontend React + MSAL**, andá a
   **API permissions → Add a permission → APIs my organization uses**,
   buscá tu app del backend y agregá el scope `access_as_user`.
4. En el frontend, al pedir el token con MSAL, solicitá ese scope:
   ```js
   const response = await instance.acquireTokenSilent({
     scopes: ["api://<client-id-del-backend>/access_as_user"],
   });
   ```
   Así el token que llega al backend va a tener `aud = api://<client-id>`.
5. En tu `.env` del backend, `AZURE_API_AUDIENCE` debe ser exactamente ese
   *Application ID URI* (`api://<client-id>`), y `AZURE_TENANT_ID` el ID de
   tu tenant.

Si el `aud` del token no coincide con `AZURE_API_AUDIENCE`, o el `iss` no
coincide con `https://login.microsoftonline.com/<tenant>/v2.0`, API Gateway
va a rechazar la request con 401 **antes** de que llegue a tu Lambda.

## 5. Configuración de AWS (cuenta educativa)

Este proyecto usa **un único `.env`** (no hay `.env.dev` / `.env.prod`
separados). Copiá la plantilla:

```bash
cp .env.example .env
```

Y completá con los datos que te da el panel de AWS Academy ("AWS Details" →
"AWS CLI"):

```
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_SESSION_TOKEN=...
AWS_ACCOUNT_ID=...
AWS_REGION=us-east-1
AWS_ROLE_ARN=arn:aws:iam::<tu-account-id>:role/LabRole
```

### Por qué `AWS_ROLE_ARN` y no el rol autogenerado de Serverless

Por defecto, Serverless Framework crea un Rol IAM nuevo para las Lambdas.
Las cuentas de AWS Academy Learner Lab **no permiten crear roles ni
políticas IAM nuevas** (está bloqueado por política de la organización), así
que el deploy fallaría con `AccessDenied`. La solución es reutilizar el rol
que la cuenta educativa ya trae creado, normalmente llamado **`LabRole`**.
`serverless.yml` lo referencia así:

```yaml
provider:
  iam:
    role: ${env:AWS_ROLE_ARN}
```

Si tu Learner Lab usa otro nombre de rol, revisá en **IAM → Roles** en la
consola de AWS y ajustá `AWS_ROLE_ARN`.

### Por qué las credenciales AWS no están en `provider.environment`

`AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` y
`AWS_SESSION_TOKEN` son nombres **reservados** por AWS Lambda: no se pueden
declarar como variables de entorno de una función (el deploy falla si lo
intentás). Por eso en este proyecto esas variables se usan **solo** para que
la CLI de Serverless/AWS SDK se autentiquen al desplegar — nunca viajan
dentro del Lambda. Dentro del código, el SDK de AWS (`@aws-sdk/client-dynamodb`)
toma la región automáticamente del entorno de ejecución de Lambda.

### Credenciales temporales (importante)

Las credenciales de Learner Lab **expiran cada pocas horas**. Cuando eso
pase vas a ver errores tipo `ExpiredTokenException` al desplegar. Solución:
volvé a copiar las 3 credenciales desde el panel de AWS Academy y
actualizá tu `.env` (y los secrets de GitHub si vas a correr el CI/CD).

## 6. Instalar y desplegar

```bash
npm install
npm run deploy          # despliega a stage "dev"
npm run deploy:prod     # despliega a stage "prod"
```

Al terminar, Serverless imprime las URLs del API Gateway (algo como
`https://xxxxx.execute-api.us-east-1.amazonaws.com/api/orders`). Como el
proyecto no usa dominio propio (no hay presupuesto para uno), se trabaja
directo con esa URL default de `execute-api`.

Para desarrollo local sin desplegar:

```bash
npm run offline   # levanta serverless-offline sin exigir el JWT (--noAuth)
```

Para borrar todo lo desplegado:

```bash
npm run remove
```

## 7. Endpoints

### Orders (`/api/orders`)

| Método | Path | Descripción |
|---|---|---|
| POST | `/api/orders` | Crea un pedido y descuenta stock (transaccional) |
| GET | `/api/orders` | Lista pedidos (`?status=PENDING` opcional) |
| GET | `/api/orders/{id}` | Obtiene un pedido |
| PUT | `/api/orders/{id}/status` | Actualiza el estado del pedido |
| DELETE | `/api/orders/{id}` | Elimina un pedido |

### Catalog (`/api/catalog`)

| Método | Path | Descripción |
|---|---|---|
| POST | `/api/catalog` | Crea un producto |
| GET | `/api/catalog` | Lista productos (`?category=...` opcional) |
| GET | `/api/catalog/{id}` | Obtiene un producto |
| PUT | `/api/catalog/{id}` | Actualiza un producto (parcial) |
| DELETE | `/api/catalog/{id}` | Elimina un producto |

Todos requieren header `Authorization: Bearer <token-de-azure-ad>`.

## 8. CI/CD (GitHub Actions)

El workflow `.github/workflows/deploy.yml` despliega automáticamente al
hacer push a `main`. Necesita estos **secrets** en el repo
(Settings → Secrets and variables → Actions):

- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_SESSION_TOKEN`
- `AWS_ACCOUNT_ID`
- `AWS_REGION`
- `AWS_ROLE_ARN`
- `AZURE_TENANT_ID`
- `AZURE_API_AUDIENCE`

**Ojo con Learner Lab**: como las credenciales expiran, el workflow va a
empezar a fallar solo hasta que actualices `AWS_SESSION_TOKEN` (y
normalmente las otras dos también, porque Learner Lab las rota juntas) en
los secrets del repo antes de la próxima corrida. Esto es justamente lo que
probablemente te pedía "más parámetros" en el otro proyecto: sin
`AWS_SESSION_TOKEN`, cualquier llamada con credenciales temporales de STS es
rechazada por AWS.

## 9. Estructura del proyecto

```
mi-backend-serverless/
├── src/
│   ├── functions/
│   │   ├── orders/        # createOrder, getOrder, getOrders, updateOrderStatus, deleteOrder
│   │   ├── catalog/       # createProduct, getProduct, getProducts, updateProduct, deleteProduct
│   │   ├── notify/        # stub, pendiente RabbitMQ (no desplegado)
│   │   ├── audit/         # stub, pendiente Kafka (no desplegado)
│   │   └── report/        # stub, pendiente Kafka (no desplegado)
│   ├── libs/
│   │   ├── db/dynamoClient.js
│   │   ├── utils/{response.js,logger.js}
│   │   └── middlewares/{auth.js,errorHandler.js}
│   └── models/{order.model.js,product.model.js}
├── infra/resources/dynamodb.yml   # tablas DynamoDB (CloudFormation)
├── tests/unit/...
├── .github/workflows/deploy.yml
├── serverless.yml
├── package.json
├── .env.example
└── .gitignore
```

> Nota: a diferencia del árbol original, cada carpeta de función tiene solo
> `handler.js` (sin `index.js` intermedio), porque `serverless.yml` apunta
> directo a `handler.js` y ese archivo extra no aportaba nada funcional acá.

## 10. Próximos pasos sugeridos

- **notify**: crear un broker (Amazon MQ para RabbitMQ) y una Lambda
  disparada por ese broker; `createOrder` publicaría un evento al confirmar
  el pedido.
- **audit / report**: evaluar Amazon MSK (Kafka administrado) o, si el
  presupuesto de la cuenta educativa no lo permite, Kinesis Data Streams
  como alternativa más económica con semántica similar.
- **getOrders / getProducts**: reemplazar el `Scan` por `Query` sobre un GSI
  cuando el volumen de datos crezca.
- **Dominio propio**: si en el futuro se dispone de un dominio, agregar
  `serverless-domain-manager` para exponer la API bajo un dominio propio en
  vez de la URL default de `execute-api`.
