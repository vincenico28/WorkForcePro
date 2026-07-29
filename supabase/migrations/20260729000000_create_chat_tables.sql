-- Create channels table
CREATE TABLE public.channels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT,
    type TEXT NOT NULL CHECK (type IN ('direct', 'group')),
    created_by UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create channel_members table
CREATE TABLE public.channel_members (
    channel_id UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    last_read_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (channel_id, employee_id)
);

-- Create messages table
CREATE TABLE public.messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    channel_id UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Turn on RLS
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Enable Supabase Realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- RLS Policies
-- Channels: Anyone in the org can read group channels. Only members can read direct channels.
CREATE POLICY "Users can view channels they are members of or are public groups" ON public.channels
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.channel_members 
            WHERE channel_id = id AND employee_id = auth.uid()
        )
        OR type = 'group'
    );

CREATE POLICY "Users can create channels" ON public.channels
    FOR INSERT WITH CHECK (true);

-- Channel Members: Users can see members of channels they are in, or group channels
CREATE POLICY "Users can view channel members" ON public.channel_members
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.channel_members cm2 
            WHERE cm2.channel_id = channel_id AND cm2.employee_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM public.channels c WHERE c.id = channel_id AND c.type = 'group'
        )
    );

CREATE POLICY "Users can join channels" ON public.channel_members
    FOR INSERT WITH CHECK (true);

-- Messages: Users can view and insert messages in channels they are members of
CREATE POLICY "Users can view messages in their channels" ON public.messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.channel_members 
            WHERE channel_id = messages.channel_id AND employee_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert messages in their channels" ON public.messages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.channel_members 
            WHERE channel_id = messages.channel_id AND employee_id = auth.uid()
        )
    );

-- Functions and Triggers
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger AS \$\$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
\$\$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';
REVOKE EXECUTE ON FUNCTION public.handle_updated_at() FROM PUBLIC;

CREATE TRIGGER set_channels_updated_at
    BEFORE UPDATE ON public.channels
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_messages_updated_at
    BEFORE UPDATE ON public.messages
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
