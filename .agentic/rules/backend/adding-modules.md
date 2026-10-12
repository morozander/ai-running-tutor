---
name: backend-adding-modules
description: Step-by-step guide for adding domain and feature modules
globs: ["backend/src/**/*.ts"]
alwaysApply: false
applies_to: [cursor, claude]
priority: normal
---

# Adding New Modules

## New domain module

Use the generator script:

```bash
cd backend && pnpm create:domain product
```

Or create manually:

```
backend/src/modules/domain/product/
├── entities/
│   └── product.entity.ts
├── services/
│   └── product.service.ts    # READ-ONLY
├── queries/
│   └── get-product.query.ts  # optional CQRS
├── __tests__/
│   ├── product.entity.spec.ts
│   └── product.service.spec.ts
└── product.module.ts
```

### Entity template

```ts
@ObjectType()
@Entity({ tableName: 'products' })
export class Product extends BaseEntity {
  @Field()
  @Property()
  name!: string;

  static create(params: { name: string }): Product {
    const normalized = params.name.trim();
    if (!normalized) throw new DomainValidationException('Name required');

    const product = new Product();
    product.name = normalized;
    return product;
  }
}
```

### Service template (READ-ONLY)

```ts
@Injectable()
export class ProductService {
  constructor(private readonly em: EntityManager) {}

  async findById(id: string): Promise<Product> {
    const product = await this.em.findOne(Product, { id });
    if (!product) throw new EntityNotFoundException('Product', id);
    return product;
  }
}
```

## New feature module

```
backend/src/modules/features/catalog/
├── dto/
│   └── create-product.input.ts
├── services/
│   └── catalog.service.ts    # handles mutations
├── resolvers/
│   └── catalog.resolver.ts
└── catalog.module.ts
```

### Feature service (mutations)

```ts
@Injectable()
export class CatalogService {
  constructor(
    private readonly em: EntityManager,
    private readonly productService: ProductService,
  ) {}

  async createProduct(input: CreateProductInput): Promise<Product> {
    const product = Product.create({ name: input.name });
    await this.em.persistAndFlush(product);
    return product;
  }
}
```

## Register modules

```ts
// domain.modules.ts
export const DomainModules = [UserModule, ProductModule];

// feature.modules.ts
export const FeatureModules = [RegistrationModule, CatalogModule];
```
