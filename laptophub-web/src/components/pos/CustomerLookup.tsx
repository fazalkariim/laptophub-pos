'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { useCustomerSearch, useCreateCustomer } from '@/hooks/useCustomers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Customer } from '@/types';

interface CustomerLookupProps {
  attached: Customer | null;
  onAttach: (c: Customer) => void;
  onClear: () => void;
}

export function CustomerLookup({
  attached,
  onAttach,
  onClear,
}: CustomerLookupProps) {
  const [query, setQuery] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const { data: results, isLoading } = useCustomerSearch(query);
  const createCustomer = useCreateCustomer();

  // inline create form
  const [newName, setNewName] = useState('');
  const [newContact, setNewContact] = useState('');

  function handleCreate() {
    if (newName.trim().length < 2) {
      toast.error('Naam likhein');
      return;
    }
    createCustomer.mutate(
      { name: newName.trim(), contact: newContact.trim() || undefined },
      {
        onSuccess: (res) => {
          if (res.warning) toast.warning(res.warning.message);
          else toast.success('Customer ban gaya');
          onAttach(res.customer);
          setShowCreate(false);
          setNewName('');
          setNewContact('');
          setQuery('');
        },
        onError: (err: any) =>
          toast.error(err?.response?.data?.message ?? 'Customer nahi bana'),
      }
    );
  }

  // Agar customer attached hai — uska card dikhao
  if (attached) {
    return (
      <div className="rounded-lg border p-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium">{attached.name}</div>
            <div className="text-xs text-muted-foreground">
              {attached.contact ?? 'No contact'}
            </div>
          </div>
          <button
            onClick={onClear}
            className="text-xs text-red-500 hover:underline"
          >
            Hataayein
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {!showCreate ? (
        <>
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Customer dhoondein (naam/phone)…"
          />
          {query.trim().length >= 2 && (
            <div className="rounded-md border">
              {isLoading ? (
                <div className="p-3 text-xs text-muted-foreground">
                  Dhoondh rahe…
                </div>
              ) : results && results.length > 0 ? (
                <ul className="max-h-48 overflow-y-auto divide-y">
                  {results.map((c) => (
                    <li
                      key={c.id}
                      onClick={() => {
                        onAttach(c);
                        setQuery('');
                      }}
                      className="cursor-pointer px-3 py-2 text-sm hover:bg-muted"
                    >
                      <div className="font-medium">{c.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {c.contact ?? 'No contact'}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="p-3 text-xs text-muted-foreground">
                  Koi customer nahi mila.
                </div>
              )}
            </div>
          )}
          <button
            onClick={() => setShowCreate(true)}
            className="text-xs text-primary hover:underline"
          >
            + Naya customer banayein
          </button>
        </>
      ) : (
        <div className="space-y-2 rounded-md border p-3">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Naam"
          />
          <Input
            value={newContact}
            onChange={(e) => setNewContact(e.target.value)}
            placeholder="Contact (optional)"
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="tertiary"
              onClick={handleCreate}
              disabled={createCustomer.isPending}
            >
              {createCustomer.isPending ? 'Ban raha…' : 'Banayein & attach'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowCreate(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}