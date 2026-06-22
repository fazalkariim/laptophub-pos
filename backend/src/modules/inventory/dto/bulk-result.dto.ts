import { ApiProperty } from '@nestjs/swagger';

// Ek fail hui row ka detail
export class FailedRow {
  @ApiProperty({ example: 3, description: 'Row number ya index' })
  row: number;

  @ApiProperty({ example: 'SN002' })
  serial: string;

  @ApiProperty({ example: 'Serial pehle se stock mein hai' })
  reason: string;
}

// Poore batch ka result
export class BulkResultDto {
  @ApiProperty({ example: 195, description: 'Kitne successfully import hue' })
  imported: number;

  @ApiProperty({ example: 5, description: 'Kitne fail hue' })
  failedCount: number;

  @ApiProperty({ type: [FailedRow], description: 'Fail hui rows reason ke saath' })
  failed: FailedRow[];
}