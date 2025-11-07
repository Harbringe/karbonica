import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Project } from './Project';

export enum MintingOperationType {
  MINT = 'MINT',
  BURN = 'BURN',
}

@Entity('minting_transactions')
export class MintingTransaction {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'project_id' })
  projectId!: string;

  //   @ManyToOne(() => Project)
  //   @JoinColumn({ name: 'project_id' })
  //   project!: Project;

  @Column({ name: 'policy_id' })
  policyId!: string;

  @Column({ name: 'asset_name' })
  assetName!: string;

  @Column({ type: 'bigint' })
  quantity!: string;

  @Column({
    type: 'enum',
    enum: MintingOperationType,
  })
  operation!: MintingOperationType;

  @Column({ name: 'tx_hash' })
  txHash!: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: any;

  @Column({ name: 'policy_script', type: 'jsonb' })
  policyScript!: any;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
