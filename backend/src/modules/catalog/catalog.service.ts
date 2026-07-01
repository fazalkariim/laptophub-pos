import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { TenantPrismaService } from '../../prisma/tenant-prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import {
  getPaginationParams,
  buildPaginatedResult,
} from '../../common/utils/paginate';

@Injectable()
export class CatalogService {
  constructor(private readonly tenantPrisma: TenantPrismaService) {}

  // READ — saare products (scoping khud lagegi)
  async findAll(page = 1, limit = 20) {
    const { skip, take, page: p, limit: l } = getPaginationParams(page, limit);

    const where = { deletedAt: null }; // sirf active (deleted nahi)

    const [products, total] = await Promise.all([
      this.tenantPrisma.client.product.findMany({
        where: where as any,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.tenantPrisma.client.product.count({ where: where as any }),
    ]);

    return buildPaginatedResult(products, total, p, l);
  }

  // READ — ek product apni id se
  async findOne(id: string) {
    const product = await this.tenantPrisma.client.product.findFirst({
      where: { id, deletedAt: null } as any, // deleted ko "nahi mila" treat karo
    });
    if (!product) {
      throw new NotFoundException('Product nahi mila');
    }
    return product;
  }

  // CREATE — naya product
  async create(dto: CreateProductDto) {
    // SKU pehle se to nahi? (same tenant ke andar)
    const existing = await this.tenantPrisma.client.product.findFirst({
      where: { sku: dto.sku },
    });
    if (existing) {
      throw new ConflictException('Ye SKU pehle se maujood hai');
    }

    return this.tenantPrisma.client.product.create({
      data: {
        brand: dto.brand,
        model: dto.model,
        specs: dto.specs,
        category: dto.category,
        sku: dto.sku,
        barcode: dto.barcode,
      } as any,
    });
  }

  // UPDATE — product badlo
  async update(id: string, dto: UpdateProductDto) {
    // Pehle confirm karo product maujood hai (aur isi tenant ka hai)
    await this.findOne(id);

    // Agar SKU badal raha hai, to naya SKU kisi aur product ka to nahi?
    if (dto.sku) {
      const clash = await this.tenantPrisma.client.product.findFirst({
        where: { sku: dto.sku, id: { not: id } },
      });
      if (clash) {
        throw new ConflictException('Ye SKU kisi aur product ka hai');
      }
    }

    return this.tenantPrisma.client.product.update({
      where: { id },
      data: dto as any,
    });
  }

  // DELETE — product hatao
  async remove(id: string) {
    await this.findOne(id); // maujood hai confirm

    // Soft delete — actually hatane ke bajaye mark karo
    await this.tenantPrisma.client.product.update({
      where: { id },
      data: { deletedAt: new Date() } as any,
    });
    return { message: 'Product hata diya gaya (soft delete)' };
  }
}
