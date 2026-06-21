import { PartialType } from '@nestjs/swagger';
import { CreateProductDto } from './create-product.dto';

// PartialType create DTO ke saare fields ko optional bana deta hai.
// Yani update mein aap sirf jo badalna ho wahi bhejo.
export class UpdateProductDto extends PartialType(CreateProductDto) {}