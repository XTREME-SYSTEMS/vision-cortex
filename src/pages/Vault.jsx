import React, { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Lock, Key, Ticket, LineChart, Wallet, Coins, Brain, Cpu, Network, Shield, Mail } from 'lucide-react';
import VaultAccounts from '@/components/vault/VaultAccounts';
import ApiKeyManager from '@/components/vault/ApiKeyManager';
import PromoCodes from '@/components/vault/PromoCodes';
import PaperTradingTab from '@/components/vault/PaperTradingTab';
import CryptoWallets from '@/components/vault/CryptoWallets';
import AgentPaymentsTab from '@/components/vault/AgentPaymentsTab';
import AdvisorTab from '@/components/vault/AdvisorTab';
import CapabilityTogglePanel from '@/components/vault/CapabilityTogglePanel';
import McpManager from '@/components/vault/McpManager';
import VaultSecurityPanel from '@/components/vault/VaultSecurityPanel';
import EmailAccountsPanel from '@/components/vault/EmailAccountsPanel';

export default function Vault() {
  const [tab, setTab] = useState('accounts');

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-4">
      <div>
        <h1 className="text-xl font-display font-semibold flex items-center gap-2">
          <Lock className="w-5 h-5" /> Vault
        </h1>
        <p className="text-sm text-muted-foreground">Secure storage for accounts, secrets, keys, capabilities, MCP, emails & financial tools</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid grid-cols-4 md:grid-cols-11 w-full">
          <TabsTrigger value="accounts" className="text-xs gap-1"><Lock className="w-3 h-3" /> Accounts</TabsTrigger>
          <TabsTrigger value="keys" className="text-xs gap-1"><Key className="w-3 h-3" /> API Keys</TabsTrigger>
          <TabsTrigger value="capabilities" className="text-xs gap-1"><Cpu className="w-3 h-3" /> Capabilities</TabsTrigger>
          <TabsTrigger value="mcp" className="text-xs gap-1"><Network className="w-3 h-3" /> MCP</TabsTrigger>
          <TabsTrigger value="emails" className="text-xs gap-1"><Mail className="w-3 h-3" /> Emails</TabsTrigger>
          <TabsTrigger value="security" className="text-xs gap-1"><Shield className="w-3 h-3" /> Security</TabsTrigger>
          <TabsTrigger value="promo" className="text-xs gap-1"><Ticket className="w-3 h-3" /> Promo</TabsTrigger>
          <TabsTrigger value="paper" className="text-xs gap-1"><LineChart className="w-3 h-3" /> Paper</TabsTrigger>
          <TabsTrigger value="wallets" className="text-xs gap-1"><Wallet className="w-3 h-3" /> Wallets</TabsTrigger>
          <TabsTrigger value="payments" className="text-xs gap-1"><Coins className="w-3 h-3" /> Agent Pay</TabsTrigger>
          <TabsTrigger value="advisor" className="text-xs gap-1"><Brain className="w-3 h-3" /> Advisor</TabsTrigger>
        </TabsList>

        <TabsContent value="accounts" className="mt-4"><VaultAccounts /></TabsContent>
        <TabsContent value="keys" className="mt-4"><ApiKeyManager /></TabsContent>
        <TabsContent value="capabilities" className="mt-4"><CapabilityTogglePanel /></TabsContent>
        <TabsContent value="mcp" className="mt-4"><McpManager /></TabsContent>
        <TabsContent value="emails" className="mt-4"><EmailAccountsPanel /></TabsContent>
        <TabsContent value="security" className="mt-4"><VaultSecurityPanel /></TabsContent>
        <TabsContent value="promo" className="mt-4"><PromoCodes /></TabsContent>
        <TabsContent value="paper" className="mt-4"><PaperTradingTab /></TabsContent>
        <TabsContent value="wallets" className="mt-4"><CryptoWallets /></TabsContent>
        <TabsContent value="payments" className="mt-4"><AgentPaymentsTab /></TabsContent>
        <TabsContent value="advisor" className="mt-4"><AdvisorTab /></TabsContent>
      </Tabs>
    </div>
  );
}