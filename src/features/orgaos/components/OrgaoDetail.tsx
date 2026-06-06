'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CopyButton } from '@/shared/components/CopyButton';
import { StateHandler } from '@/shared/components/StateHandler';
import { formatBRL, formatDate, formatCNPJ } from '@/shared/lib/formatters';
import { orgaosService } from '../lib/orgaosService';

interface OrgaoDetailProps {
  cnpj: string | null;
  open: boolean;
  onClose: () => void;
}

export function OrgaoDetail({ cnpj, open, onClose }: OrgaoDetailProps) {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['orgao-detail', cnpj],
    queryFn: () => orgaosService.getDetail(cnpj!),
    enabled: !!cnpj,
    retry: (count, err) => {
      return count < 3 && (err as Error).message !== 'not_found';
    },
  });

  const isNotFound = isError && (error as Error)?.message === 'not_found';

  const orgao = data?.orgao;
  const contratos = data?.contratos ?? [];

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>Detalhe do Órgão</SheetTitle>
          <SheetDescription>
            {orgao?.razao_social ?? (cnpj ? `CNPJ: ${formatCNPJ(cnpj)}` : '')}
          </SheetDescription>
        </SheetHeader>

        <StateHandler
          isLoading={isLoading}
          isError={isError && !isNotFound}
          isEmpty={isNotFound}
          emptyMessage="Órgão não encontrado."
          onRetry={() => void refetch()}
        >
          {orgao && (
            <div className="mt-4 flex flex-col gap-6">
              {/* Cadastro */}
              <section>
                <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Cadastro
                </h3>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <dt className="text-muted-foreground">CNPJ</dt>
                  <dd className="flex items-center gap-1 font-medium">
                    {formatCNPJ(orgao.cnpj)}
                    <CopyButton value={orgao.cnpj} label="Copiar CNPJ" />
                  </dd>

                  <dt className="text-muted-foreground">Nome Fantasia</dt>
                  <dd>{orgao.nome_fantasia}</dd>

                  <dt className="text-muted-foreground">Esfera</dt>
                  <dd>
                    <Badge variant="secondary">{orgao.esfera}</Badge>
                  </dd>

                  <dt className="text-muted-foreground">Poder</dt>
                  <dd>{orgao.poder}</dd>

                  <dt className="text-muted-foreground">Município / UF</dt>
                  <dd>
                    {orgao.municipio} — {orgao.uf}
                  </dd>

                  {orgao.endereco && (
                    <>
                      <dt className="text-muted-foreground">Endereço</dt>
                      <dd>{orgao.endereco}</dd>
                    </>
                  )}

                  {orgao.cep && (
                    <>
                      <dt className="text-muted-foreground">CEP</dt>
                      <dd>{orgao.cep}</dd>
                    </>
                  )}
                </dl>
              </section>

              <Separator />

              {/* Contatos */}
              <section>
                <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Contatos
                </h3>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  {orgao.email_geral && (
                    <>
                      <dt className="text-muted-foreground">E-mail geral</dt>
                      <dd className="flex items-center gap-1">
                        <span className="truncate">{orgao.email_geral}</span>
                        <CopyButton
                          value={orgao.email_geral}
                          label="Copiar e-mail geral"
                        />
                      </dd>
                    </>
                  )}

                  {orgao.email_licitacoes && (
                    <>
                      <dt className="text-muted-foreground">E-mail licitações</dt>
                      <dd className="flex items-center gap-1">
                        <span className="truncate">{orgao.email_licitacoes}</span>
                        <CopyButton
                          value={orgao.email_licitacoes}
                          label="Copiar e-mail licitações"
                        />
                      </dd>
                    </>
                  )}

                  {orgao.telefone && (
                    <>
                      <dt className="text-muted-foreground">Telefone</dt>
                      <dd className="flex items-center gap-1">
                        {orgao.telefone}
                        <CopyButton
                          value={orgao.telefone}
                          label="Copiar telefone"
                        />
                      </dd>
                    </>
                  )}

                  {orgao.site_oficial && (
                    <>
                      <dt className="text-muted-foreground">Site</dt>
                      <dd className="truncate">
                        <a
                          href={orgao.site_oficial}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary underline-offset-4 hover:underline"
                        >
                          {orgao.site_oficial}
                        </a>
                      </dd>
                    </>
                  )}

                  {orgao.nome_responsavel && (
                    <>
                      <dt className="text-muted-foreground">Responsável</dt>
                      <dd>
                        {orgao.nome_responsavel}
                        {orgao.cargo_responsavel && (
                          <span className="text-muted-foreground">
                            {' '}
                            ({orgao.cargo_responsavel})
                          </span>
                        )}
                      </dd>
                    </>
                  )}

                  {orgao.email_responsavel && (
                    <>
                      <dt className="text-muted-foreground">E-mail resp.</dt>
                      <dd className="flex items-center gap-1">
                        <span className="truncate">{orgao.email_responsavel}</span>
                        <CopyButton
                          value={orgao.email_responsavel}
                          label="Copiar e-mail responsável"
                        />
                      </dd>
                    </>
                  )}
                </dl>
              </section>

              <Separator />

              {/* Resumo de contratos */}
              <section>
                <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Contratos
                </h3>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <dt className="text-muted-foreground">Total de contratos</dt>
                  <dd className="font-medium">{orgao.total_contratos}</dd>

                  <dt className="text-muted-foreground">Valor total</dt>
                  <dd className="font-medium">
                    {formatBRL(orgao.valor_total_contratos)}
                  </dd>

                  {orgao.ultimo_contrato_em && (
                    <>
                      <dt className="text-muted-foreground">Último contrato</dt>
                      <dd>{formatDate(orgao.ultimo_contrato_em)}</dd>
                    </>
                  )}
                </dl>

                {(orgao.categorias_compra ?? []).length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {(orgao.categorias_compra ?? []).map((cat) => (
                      <Badge key={cat} variant="outline" className="text-xs">
                        {cat}
                      </Badge>
                    ))}
                  </div>
                )}
              </section>

              {contratos.length > 0 && (
                <>
                  <Separator />
                  <section>
                    <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                      Contratos vinculados ({contratos.length})
                    </h3>
                    <div className="flex flex-col gap-3">
                      {contratos.map((c) => (
                        <div
                          key={c.id}
                          className="rounded-md border p-3 text-sm"
                        >
                          <p className="font-medium leading-snug">{c.objeto}</p>
                          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                            {c.modalidade && <span>{c.modalidade}</span>}
                            {c.categoria && <span>{c.categoria}</span>}
                            <span>{formatBRL(c.valor_final)}</span>
                            {c.data_assinatura && (
                              <span>{formatDate(c.data_assinatura)}</span>
                            )}
                          </div>
                          {c.fornecedor_nome && (
                            <p className="mt-1 text-xs text-muted-foreground">
                              {c.fornecedor_nome}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </section>
                </>
              )}
            </div>
          )}
        </StateHandler>
      </SheetContent>
    </Sheet>
  );
}
