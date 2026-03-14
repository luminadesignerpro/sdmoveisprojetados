import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface WhatsAppConversation {
  id: string;
  phone_number: string;
  contact_name: string | null;
  status: string;
  lead_status: string;
  last_message_at: string;
  lastMessage?: string;
  unreadCount?: number;
}

export interface WhatsAppMessage {
  id: string;
  conversation_id: string;
  direction: 'inbound' | 'outbound';
  content: string;
  message_type: string;
  status: string;
  created_at: string;
}

// Use `any` cast on supabase client for tables not yet in the generated types
const db = supabase as any;

export function useWhatsApp() {
  const [conversations, setConversations] = useState<WhatsAppConversation[]>([]);
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const { toast } = useToast();

  const fetchConversations = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await db
        .from('whatsapp_conversations')
        .select(`
          *,
          whatsapp_messages (
            id,
            content,
            direction,
            status,
            created_at
          )
        `)
        .order('last_message_at', { ascending: false });

      if (error) throw error;

      const enrichedConversations = (data || []).map((conv: any) => {
        const msgs = conv.whatsapp_messages || [];
        const sortedMsgs = msgs.sort((a: any, b: any) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        const lastMessage = sortedMsgs[0];
        const unreadCount = msgs.filter((m: any) => 
          m.direction === 'inbound' && m.status !== 'read'
        ).length;

        return {
          id: conv.id,
          phone_number: conv.phone_number,
          contact_name: conv.contact_name,
          status: conv.status,
          lead_status: conv.lead_status,
          last_message_at: conv.last_message_at,
          lastMessage: lastMessage?.content || '',
          unreadCount,
        };
      });

      setConversations(enrichedConversations);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as conversas.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const fetchMessages = useCallback(async (conversationId: string) => {
    try {
      const { data, error } = await db
        .from('whatsapp_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      setMessages((data || []) as WhatsAppMessage[]);
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as mensagens.',
        variant: 'destructive',
      });
    }
  }, [toast]);

  const sendMessage = useCallback(async (conversationId: string, message: string) => {
    setSendingMessage(true);
    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-send', {
        body: { conversationId, message },
      });

      if (error) throw error;

      const isReal = data?.mode === 'real';
      toast({
        title: isReal ? '✅ Mensagem Enviada' : '📋 Modo Simulação',
        description: isReal
          ? 'Mensagem enviada via WhatsApp com sucesso!'
          : 'Evolution API não configurada. Mensagem salva localmente.',
      });

      await fetchMessages(conversationId);
      await fetchConversations();

      return { success: true, message: data?.message, mode: data?.mode };
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível enviar a mensagem.',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setSendingMessage(false);
    }
  }, [fetchMessages, fetchConversations, toast]);

  useEffect(() => {
    const channel = supabase
      .channel('whatsapp-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'whatsapp_messages',
        },
        (payload) => {
          console.log('New message:', payload);
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchConversations]);

  return {
    conversations,
    messages,
    loading,
    sendingMessage,
    fetchConversations,
    fetchMessages,
    sendMessage,
  };
}
