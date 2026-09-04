"use client";

import React, {
  useCallback,
  useMemo,
  useState,
} from "react";
import {
  ChevronLeft,
  ChevronRight,
  ReceiptText,
  Search,
} from "lucide-react";

import { TransactionRecord } from "@/types";
import { Button } from "@/components/ui/Button";

interface VirtualizedTransactionTableProps {
  transactions?: TransactionRecord[];
  className?: string;
}

export const VirtualizedTransactionTable =
  React.memo(
    function VirtualizedTransactionTable({
      transactions = [],
      className = "",
    }: VirtualizedTransactionTableProps) {
      const [
        searchQuery,
        setSearchQuery,
      ] = useState("");

      const [
        filterType,
        setFilterType,
      ] = useState("All");

      const [
        currentPage,
        setCurrentPage,
      ] = useState(1);

      const pageSize = 8;

      const filteredList =
        useMemo(() => {
          const query =
            searchQuery
              .trim()
              .toLowerCase();

          return transactions.filter(
            (transaction) => {
              const scheme =
                String(
                  transaction.schemeName ??
                    ""
                ).toLowerCase();

              const ticker =
                String(
                  transaction.ticker ??
                    ""
                ).toLowerCase();

              const reference =
                String(
                  transaction.transactionRef ??
                    ""
                ).toLowerCase();

              const matchesSearch =
                !query ||
                scheme.includes(
                  query
                ) ||
                ticker.includes(
                  query
                ) ||
                reference.includes(
                  query
                );

              const matchesType =
                filterType ===
                  "All" ||
                transaction.type ===
                  filterType;

              return (
                matchesSearch &&
                matchesType
              );
            }
          );
        }, [
          transactions,
          searchQuery,
          filterType,
        ]);

      const totalPages =
        Math.max(
          1,
          Math.ceil(
            filteredList.length /
              pageSize
          )
        );

      const safeCurrentPage =
        Math.min(
          currentPage,
          totalPages
        );

      const paginatedSlice =
        useMemo(() => {
          const start =
            (safeCurrentPage -
              1) *
            pageSize;

          return filteredList.slice(
            start,
            start + pageSize
          );
        }, [
          filteredList,
          safeCurrentPage,
        ]);

      const handleNext =
        useCallback(() => {
          setCurrentPage(
            (page) =>
              Math.min(
                page + 1,
                totalPages
              )
          );
        }, [totalPages]);

      const handlePrev =
        useCallback(() => {
          setCurrentPage(
            (page) =>
              Math.max(
                page - 1,
                1
              )
          );
        }, []);

      const getTypeStyle =
        (
          type: TransactionRecord["type"]
        ) => {
          if (
            type.includes(
              "Buy"
            ) ||
            type ===
              "Switch In"
          ) {
            return "bg-[var(--positive)]/10 text-[var(--positive)] border-[var(--positive)]/20";
          }

          if (
            type ===
              "Redemption" ||
            type ===
              "Switch Out"
          ) {
            return "bg-[var(--negative)]/10 text-[var(--negative)] border-[var(--negative)]/20";
          }

          return "bg-[var(--info)]/10 text-[var(--info)] border-[var(--info)]/20";
        };

      if (
        transactions.length ===
        0
      ) {
        return (
          <div
            className={`rounded-2xl border border-border bg-[var(--card)] p-6 shadow-xl shadow-black/30 text-foreground ${className}`}
          >
            <div className="flex items-center gap-3 pb-5 border-b border-border">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center">
                <ReceiptText className="w-5 h-5" />
              </div>

              <div>
                <h3 className="text-base font-bold">
                  Transaction Stream
                </h3>

                <p className="text-xs text-muted-foreground">
                  No transaction records are available for the current portfolio.
                </p>
              </div>
            </div>

            <div className="py-12 text-center">
              <ReceiptText className="w-8 h-8 mx-auto text-muted-foreground mb-3" />

              <p className="text-sm font-semibold">
                No transactions
              </p>

              <p className="text-xs text-muted-foreground mt-1">
                Import a CAS containing transaction history to populate this table.
              </p>
            </div>
          </div>
        );
      }

      return (
        <div
          className={`rounded-2xl border border-border bg-[var(--card)] p-6 shadow-xl shadow-black/30 text-foreground ${className}`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center">
                <ReceiptText className="w-5 h-5" />
              </div>

              <div>
                <h3 className="text-base font-bold">
                  Transaction Stream
                </h3>

                <p className="text-xs text-muted-foreground">
                  {transactions.length} real transaction records
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />

                <input
                  type="text"
                  value={
                    searchQuery
                  }
                  onChange={(event) => {
                    setSearchQuery(
                      event.target.value
                    );

                    setCurrentPage(
                      1
                    );
                  }}
                  placeholder="Search..."
                  className="h-9 pl-9 pr-3 rounded-xl border border-border bg-[var(--background)] text-xs w-48"
                />
              </div>

              <select
                value={
                  filterType
                }
                onChange={(event) => {
                  setFilterType(
                    event.target.value
                  );

                  setCurrentPage(
                    1
                  );
                }}
                className="h-9 px-3 rounded-xl border border-border bg-[var(--background)] text-xs"
              >
                <option value="All">
                  All Types
                </option>

                <option value="SIP Buy">
                  SIP Debits
                </option>

                <option value="Lump Sum Buy">
                  Lump Sum
                </option>

                <option value="Redemption">
                  Redemptions
                </option>

                <option value="Dividend Payout">
                  Dividends
                </option>
              </select>
            </div>
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[var(--background-elevated)] text-[10px] uppercase font-bold text-muted-foreground border-y border-border/70">
                <tr>
                  <th className="py-3 px-4">
                    Date
                  </th>

                  <th className="py-3 px-3">
                    Type
                  </th>

                  <th className="py-3 px-3">
                    Scheme
                  </th>

                  <th className="py-3 px-3 text-right">
                    Units
                  </th>

                  <th className="py-3 px-3 text-right">
                    NAV
                  </th>

                  <th className="py-3 px-4 text-right">
                    Amount
                  </th>

                  <th className="py-3 px-4 text-right">
                    Status
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-border/70">
                {paginatedSlice.map(
                  (transaction) => (
                    <tr
                      key={
                        transaction.id
                      }
                      className="hover:bg-accent transition-colors"
                    >
                      <td className="py-3 px-4 text-muted-foreground font-mono">
                        {
                          transaction.date
                        }
                      </td>

                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${getTypeStyle(
                            transaction.type
                          )}`}
                        >
                          {
                            transaction.type
                          }
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        <span className="font-bold block truncate max-w-xs">
                          {
                            transaction.schemeName
                          }
                        </span>

                        <span className="text-[10px] text-muted-foreground font-mono">
                          Folio:{" "}
                          {
                            transaction.folioNumber
                          }
                        </span>
                      </td>

                      <td className="py-3 px-3 text-right font-mono">
                        {Number(
                          transaction.units
                        ).toFixed(
                          3
                        )}
                      </td>

                      <td className="py-3 px-3 text-right font-mono">
                        ₹
                        {Number(
                          transaction.nav
                        ).toFixed(
                          2
                        )}
                      </td>

                      <td className="py-3 px-4 text-right font-bold font-mono">
                        ₹
                        {Number(
                          transaction.amount
                        ).toLocaleString(
                          "en-IN"
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold border bg-[var(--positive)]/10 text-[var(--positive)] border-[var(--positive)]/20">
                          {
                            transaction.status
                          }
                        </span>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4 pt-4 border-t border-border flex items-center justify-between text-xs">
            <span className="text-muted-foreground text-[11px] font-mono">
              {filteredList.length ===
              0
                ? "No matching transactions"
                : `Showing ${
                    (safeCurrentPage -
                      1) *
                      pageSize +
                    1
                  } to ${Math.min(
                    safeCurrentPage *
                      pageSize,
                    filteredList.length
                  )} of ${
                    filteredList.length
                  }`}
            </span>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={
                  handlePrev
                }
                disabled={
                  safeCurrentPage ===
                  1
                }
                className="h-8 px-2.5 text-xs gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Prev
              </Button>

              <span className="text-xs font-mono font-semibold px-2">
                {safeCurrentPage}{" "}
                / {totalPages}
              </span>

              <Button
                variant="outline"
                size="sm"
                onClick={
                  handleNext
                }
                disabled={
                  safeCurrentPage >=
                  totalPages
                }
                className="h-8 px-2.5 text-xs gap-1"
              >
                Next
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>
      );
    }
  );