// Vygenerováno skriptem scripts/gen-db-types.mjs – neupravujte ručně.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  __InternalSupabase: { PostgrestVersion: "12" };
  public: {
    Tables: {
      addresses: {
        Row: {
          id: string;
          user_id: string;
          label: string | null;
          first_name: string;
          last_name: string;
          company: string | null;
          street: string;
          city: string;
          postal_code: string;
          country: Database["public"]["Enums"]["market_code"];
          phone: string | null;
          is_default_shipping: boolean;
          is_default_billing: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          label?: string | null;
          first_name: string;
          last_name: string;
          company?: string | null;
          street: string;
          city: string;
          postal_code: string;
          country?: Database["public"]["Enums"]["market_code"];
          phone?: string | null;
          is_default_shipping?: boolean;
          is_default_billing?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          label?: string | null;
          first_name?: string;
          last_name?: string;
          company?: string | null;
          street?: string;
          city?: string;
          postal_code?: string;
          country?: Database["public"]["Enums"]["market_code"];
          phone?: string | null;
          is_default_shipping?: boolean;
          is_default_billing?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      attribute_values: {
        Row: {
          id: string;
          attribute_id: string;
          value: string;
          slug: string;
          color_hex: string | null;
          sort_order: number;
          translations: Json;
        };
        Insert: {
          id?: string;
          attribute_id: string;
          value: string;
          slug: string;
          color_hex?: string | null;
          sort_order?: number;
          translations?: Json;
        };
        Update: {
          id?: string;
          attribute_id?: string;
          value?: string;
          slug?: string;
          color_hex?: string | null;
          sort_order?: number;
          translations?: Json;
        };
        Relationships: [
          { foreignKeyName: "attribute_values_attribute_id_fkey"; columns: ["attribute_id"]; isOneToOne: false; referencedRelation: "attributes"; referencedColumns: ["id"] },
        ];
      };
      attributes: {
        Row: {
          id: string;
          code: string;
          name: string;
          type: Database["public"]["Enums"]["attribute_type"];
          unit: string | null;
          is_filterable: boolean;
          is_comparable: boolean;
          sort_order: number;
          translations: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          name: string;
          type: Database["public"]["Enums"]["attribute_type"];
          unit?: string | null;
          is_filterable?: boolean;
          is_comparable?: boolean;
          sort_order?: number;
          translations?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          name?: string;
          type?: Database["public"]["Enums"]["attribute_type"];
          unit?: string | null;
          is_filterable?: boolean;
          is_comparable?: boolean;
          sort_order?: number;
          translations?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      audit_logs: {
        Row: {
          id: number;
          actor_id: string | null;
          action: string;
          entity: string;
          entity_id: string | null;
          before: Json | null;
          after: Json | null;
          context: Json | null;
          created_at: string;
        };
        Insert: {
          id?: never;
          actor_id?: string | null;
          action: string;
          entity: string;
          entity_id?: string | null;
          before?: Json | null;
          after?: Json | null;
          context?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: never;
          actor_id?: string | null;
          action?: string;
          entity?: string;
          entity_id?: string | null;
          before?: Json | null;
          after?: Json | null;
          context?: Json | null;
          created_at?: string;
        };
        Relationships: [];
      };
      banners: {
        Row: {
          id: string;
          placement: Database["public"]["Enums"]["banner_placement"];
          eyebrow: string | null;
          title: string;
          title_highlight: string | null;
          subtitle: string | null;
          cta_label: string | null;
          cta_href: string | null;
          image_url: string;
          image_alt: string;
          image_position: string;
          annotation: string | null;
          badge_text: string | null;
          layout: string;
          markets: Database["public"]["Enums"]["market_code"][];
          starts_at: string | null;
          ends_at: string | null;
          is_active: boolean;
          sort_order: number;
          translations: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          placement: Database["public"]["Enums"]["banner_placement"];
          eyebrow?: string | null;
          title: string;
          title_highlight?: string | null;
          subtitle?: string | null;
          cta_label?: string | null;
          cta_href?: string | null;
          image_url: string;
          image_alt?: string;
          image_position?: string;
          annotation?: string | null;
          badge_text?: string | null;
          layout?: string;
          markets?: Database["public"]["Enums"]["market_code"][];
          starts_at?: string | null;
          ends_at?: string | null;
          is_active?: boolean;
          sort_order?: number;
          translations?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          placement?: Database["public"]["Enums"]["banner_placement"];
          eyebrow?: string | null;
          title?: string;
          title_highlight?: string | null;
          subtitle?: string | null;
          cta_label?: string | null;
          cta_href?: string | null;
          image_url?: string;
          image_alt?: string;
          image_position?: string;
          annotation?: string | null;
          badge_text?: string | null;
          layout?: string;
          markets?: Database["public"]["Enums"]["market_code"][];
          starts_at?: string | null;
          ends_at?: string | null;
          is_active?: boolean;
          sort_order?: number;
          translations?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      brands: {
        Row: {
          id: string;
          slug: string;
          name: string;
          description: string | null;
          logo_url: string | null;
          seo_title: string | null;
          seo_description: string | null;
          is_active: boolean;
          translations: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          description?: string | null;
          logo_url?: string | null;
          seo_title?: string | null;
          seo_description?: string | null;
          is_active?: boolean;
          translations?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          name?: string;
          description?: string | null;
          logo_url?: string | null;
          seo_title?: string | null;
          seo_description?: string | null;
          is_active?: boolean;
          translations?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      cart_items: {
        Row: {
          id: string;
          cart_id: string;
          variant_id: string;
          quantity: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          cart_id: string;
          variant_id: string;
          quantity: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          cart_id?: string;
          variant_id?: string;
          quantity?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "cart_items_cart_id_fkey"; columns: ["cart_id"]; isOneToOne: false; referencedRelation: "carts"; referencedColumns: ["id"] },
          { foreignKeyName: "cart_items_variant_id_fkey"; columns: ["variant_id"]; isOneToOne: false; referencedRelation: "product_variants"; referencedColumns: ["id"] },
        ];
      };
      carts: {
        Row: {
          id: string;
          token_hash: string | null;
          user_id: string | null;
          market: Database["public"]["Enums"]["market_code"];
          discount_code: string | null;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          token_hash?: string | null;
          user_id?: string | null;
          market?: Database["public"]["Enums"]["market_code"];
          discount_code?: string | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          token_hash?: string | null;
          user_id?: string | null;
          market?: Database["public"]["Enums"]["market_code"];
          discount_code?: string | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      categories: {
        Row: {
          id: string;
          parent_id: string | null;
          slug: string;
          path: string;
          depth: number;
          name: string;
          description: string | null;
          image_url: string | null;
          banner_url: string | null;
          seo_title: string | null;
          seo_description: string | null;
          is_active: boolean;
          show_in_menu: boolean;
          sort_order: number;
          translations: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          parent_id?: string | null;
          slug: string;
          path: string;
          depth?: number;
          name: string;
          description?: string | null;
          image_url?: string | null;
          banner_url?: string | null;
          seo_title?: string | null;
          seo_description?: string | null;
          is_active?: boolean;
          show_in_menu?: boolean;
          sort_order?: number;
          translations?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          parent_id?: string | null;
          slug?: string;
          path?: string;
          depth?: number;
          name?: string;
          description?: string | null;
          image_url?: string | null;
          banner_url?: string | null;
          seo_title?: string | null;
          seo_description?: string | null;
          is_active?: boolean;
          show_in_menu?: boolean;
          sort_order?: number;
          translations?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "categories_parent_id_fkey"; columns: ["parent_id"]; isOneToOne: false; referencedRelation: "categories"; referencedColumns: ["id"] },
        ];
      };
      category_attributes: {
        Row: {
          category_id: string;
          attribute_id: string;
          sort_order: number;
        };
        Insert: {
          category_id: string;
          attribute_id: string;
          sort_order?: number;
        };
        Update: {
          category_id?: string;
          attribute_id?: string;
          sort_order?: number;
        };
        Relationships: [
          { foreignKeyName: "category_attributes_attribute_id_fkey"; columns: ["attribute_id"]; isOneToOne: false; referencedRelation: "attributes"; referencedColumns: ["id"] },
          { foreignKeyName: "category_attributes_category_id_fkey"; columns: ["category_id"]; isOneToOne: false; referencedRelation: "categories"; referencedColumns: ["id"] },
        ];
      };
      contact_messages: {
        Row: {
          id: string;
          name: string;
          email: string;
          order_number: string | null;
          subject: string;
          message: string;
          status: string;
          ip_hash: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          email: string;
          order_number?: string | null;
          subject: string;
          message: string;
          status?: string;
          ip_hash?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          email?: string;
          order_number?: string | null;
          subject?: string;
          message?: string;
          status?: string;
          ip_hash?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      content_pages: {
        Row: {
          slug: string;
          title: string;
          body: string;
          seo_description: string | null;
          requires_legal_review: boolean;
          footer_group: string | null;
          sort_order: number;
          is_active: boolean;
          translations: Json;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          slug: string;
          title: string;
          body?: string;
          seo_description?: string | null;
          requires_legal_review?: boolean;
          footer_group?: string | null;
          sort_order?: number;
          is_active?: boolean;
          translations?: Json;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          slug?: string;
          title?: string;
          body?: string;
          seo_description?: string | null;
          requires_legal_review?: boolean;
          footer_group?: string | null;
          sort_order?: number;
          is_active?: boolean;
          translations?: Json;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [];
      };
      customer_notes: {
        Row: {
          id: string;
          customer_id: string;
          author_id: string | null;
          body: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          customer_id: string;
          author_id?: string | null;
          body: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          customer_id?: string;
          author_id?: string | null;
          body?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      discount_codes: {
        Row: {
          id: string;
          discount_id: string;
          code: string;
          usage_limit: number | null;
          times_used: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          discount_id: string;
          code: string;
          usage_limit?: number | null;
          times_used?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          discount_id?: string;
          code?: string;
          usage_limit?: number | null;
          times_used?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [
          { foreignKeyName: "discount_codes_discount_id_fkey"; columns: ["discount_id"]; isOneToOne: false; referencedRelation: "discounts"; referencedColumns: ["id"] },
        ];
      };
      discount_redemptions: {
        Row: {
          id: string;
          discount_id: string;
          code_id: string | null;
          order_id: string;
          user_id: string | null;
          email: string;
          amount: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          discount_id: string;
          code_id?: string | null;
          order_id: string;
          user_id?: string | null;
          email: string;
          amount: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          discount_id?: string;
          code_id?: string | null;
          order_id?: string;
          user_id?: string | null;
          email?: string;
          amount?: number;
          created_at?: string;
        };
        Relationships: [
          { foreignKeyName: "discount_redemptions_code_id_fkey"; columns: ["code_id"]; isOneToOne: false; referencedRelation: "discount_codes"; referencedColumns: ["id"] },
          { foreignKeyName: "discount_redemptions_discount_id_fkey"; columns: ["discount_id"]; isOneToOne: false; referencedRelation: "discounts"; referencedColumns: ["id"] },
          { foreignKeyName: "discount_redemptions_order_id_fkey"; columns: ["order_id"]; isOneToOne: true; referencedRelation: "orders"; referencedColumns: ["id"] },
        ];
      };
      discount_targets: {
        Row: {
          discount_id: string;
          target_type: string;
          target_id: string;
        };
        Insert: {
          discount_id: string;
          target_type: string;
          target_id: string;
        };
        Update: {
          discount_id?: string;
          target_type?: string;
          target_id?: string;
        };
        Relationships: [
          { foreignKeyName: "discount_targets_discount_id_fkey"; columns: ["discount_id"]; isOneToOne: false; referencedRelation: "discounts"; referencedColumns: ["id"] },
        ];
      };
      discounts: {
        Row: {
          id: string;
          name: string;
          type: Database["public"]["Enums"]["discount_type"];
          percent_bps: number | null;
          amount_czk: number | null;
          amount_eur: number | null;
          min_subtotal_czk: number | null;
          min_subtotal_eur: number | null;
          applies_to: string;
          markets: Database["public"]["Enums"]["market_code"][];
          starts_at: string | null;
          ends_at: string | null;
          usage_limit: number | null;
          usage_limit_per_customer: number | null;
          times_used: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          type: Database["public"]["Enums"]["discount_type"];
          percent_bps?: number | null;
          amount_czk?: number | null;
          amount_eur?: number | null;
          min_subtotal_czk?: number | null;
          min_subtotal_eur?: number | null;
          applies_to?: string;
          markets?: Database["public"]["Enums"]["market_code"][];
          starts_at?: string | null;
          ends_at?: string | null;
          usage_limit?: number | null;
          usage_limit_per_customer?: number | null;
          times_used?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          type?: Database["public"]["Enums"]["discount_type"];
          percent_bps?: number | null;
          amount_czk?: number | null;
          amount_eur?: number | null;
          min_subtotal_czk?: number | null;
          min_subtotal_eur?: number | null;
          applies_to?: string;
          markets?: Database["public"]["Enums"]["market_code"][];
          starts_at?: string | null;
          ends_at?: string | null;
          usage_limit?: number | null;
          usage_limit_per_customer?: number | null;
          times_used?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      email_outbox: {
        Row: {
          id: string;
          template: string;
          to_email: string;
          locale: string;
          payload: Json;
          dedupe_key: string;
          status: string;
          attempts: number;
          last_error: string | null;
          provider_message_id: string | null;
          next_attempt_at: string;
          sent_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          template: string;
          to_email: string;
          locale?: string;
          payload?: Json;
          dedupe_key: string;
          status?: string;
          attempts?: number;
          last_error?: string | null;
          provider_message_id?: string | null;
          next_attempt_at?: string;
          sent_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          template?: string;
          to_email?: string;
          locale?: string;
          payload?: Json;
          dedupe_key?: string;
          status?: string;
          attempts?: number;
          last_error?: string | null;
          provider_message_id?: string | null;
          next_attempt_at?: string;
          sent_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      homepage_sections: {
        Row: {
          id: string;
          key: string;
          type: string;
          title: string | null;
          subtitle: string | null;
          config: Json;
          is_active: boolean;
          sort_order: number;
          translations: Json;
          updated_at: string;
        };
        Insert: {
          id?: string;
          key: string;
          type: string;
          title?: string | null;
          subtitle?: string | null;
          config?: Json;
          is_active?: boolean;
          sort_order?: number;
          translations?: Json;
          updated_at?: string;
        };
        Update: {
          id?: string;
          key?: string;
          type?: string;
          title?: string | null;
          subtitle?: string | null;
          config?: Json;
          is_active?: boolean;
          sort_order?: number;
          translations?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };
      import_jobs: {
        Row: {
          id: string;
          type: string;
          status: string;
          filename: string | null;
          total_rows: number;
          created_rows: number;
          updated_rows: number;
          error_rows: number;
          errors: Json;
          created_by: string | null;
          created_at: string;
          finished_at: string | null;
        };
        Insert: {
          id?: string;
          type?: string;
          status?: string;
          filename?: string | null;
          total_rows?: number;
          created_rows?: number;
          updated_rows?: number;
          error_rows?: number;
          errors?: Json;
          created_by?: string | null;
          created_at?: string;
          finished_at?: string | null;
        };
        Update: {
          id?: string;
          type?: string;
          status?: string;
          filename?: string | null;
          total_rows?: number;
          created_rows?: number;
          updated_rows?: number;
          error_rows?: number;
          errors?: Json;
          created_by?: string | null;
          created_at?: string;
          finished_at?: string | null;
        };
        Relationships: [];
      };
      inventory: {
        Row: {
          variant_id: string;
          quantity_on_hand: number;
          quantity_reserved: number;
          low_stock_threshold: number;
          allow_backorder: boolean;
          restock_date: string | null;
          updated_at: string;
        };
        Insert: {
          variant_id: string;
          quantity_on_hand?: number;
          quantity_reserved?: number;
          low_stock_threshold?: number;
          allow_backorder?: boolean;
          restock_date?: string | null;
          updated_at?: string;
        };
        Update: {
          variant_id?: string;
          quantity_on_hand?: number;
          quantity_reserved?: number;
          low_stock_threshold?: number;
          allow_backorder?: boolean;
          restock_date?: string | null;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "inventory_variant_id_fkey"; columns: ["variant_id"]; isOneToOne: true; referencedRelation: "product_variants"; referencedColumns: ["id"] },
        ];
      };
      inventory_movements: {
        Row: {
          id: number;
          variant_id: string;
          reason: Database["public"]["Enums"]["inventory_reason"];
          on_hand_delta: number;
          reserved_delta: number;
          on_hand_after: number;
          reserved_after: number;
          order_id: string | null;
          actor_id: string | null;
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: never;
          variant_id: string;
          reason: Database["public"]["Enums"]["inventory_reason"];
          on_hand_delta?: number;
          reserved_delta?: number;
          on_hand_after: number;
          reserved_after: number;
          order_id?: string | null;
          actor_id?: string | null;
          note?: string | null;
          created_at?: string;
        };
        Update: {
          id?: never;
          variant_id?: string;
          reason?: Database["public"]["Enums"]["inventory_reason"];
          on_hand_delta?: number;
          reserved_delta?: number;
          on_hand_after?: number;
          reserved_after?: number;
          order_id?: string | null;
          actor_id?: string | null;
          note?: string | null;
          created_at?: string;
        };
        Relationships: [
          { foreignKeyName: "inventory_movements_order_fk"; columns: ["order_id"]; isOneToOne: false; referencedRelation: "orders"; referencedColumns: ["id"] },
          { foreignKeyName: "inventory_movements_variant_id_fkey"; columns: ["variant_id"]; isOneToOne: false; referencedRelation: "product_variants"; referencedColumns: ["id"] },
        ];
      };
      markets: {
        Row: {
          code: Database["public"]["Enums"]["market_code"];
          name: string;
          currency: Database["public"]["Enums"]["currency_code"];
          locale: string;
          free_shipping_threshold: number | null;
          is_active: boolean;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          code: Database["public"]["Enums"]["market_code"];
          name: string;
          currency: Database["public"]["Enums"]["currency_code"];
          locale: string;
          free_shipping_threshold?: number | null;
          is_active?: boolean;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          code?: Database["public"]["Enums"]["market_code"];
          name?: string;
          currency?: Database["public"]["Enums"]["currency_code"];
          locale?: string;
          free_shipping_threshold?: number | null;
          is_active?: boolean;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      newsletter_subscribers: {
        Row: {
          id: string;
          email: string;
          status: Database["public"]["Enums"]["newsletter_status"];
          user_id: string | null;
          market: Database["public"]["Enums"]["market_code"];
          locale: string;
          source: string;
          consent_text: string;
          consent_at: string;
          confirm_token_hash: string | null;
          confirm_sent_at: string | null;
          confirmed_at: string | null;
          unsubscribe_token_hash: string | null;
          unsubscribed_at: string | null;
          ip_hash: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          status?: Database["public"]["Enums"]["newsletter_status"];
          user_id?: string | null;
          market?: Database["public"]["Enums"]["market_code"];
          locale?: string;
          source?: string;
          consent_text: string;
          consent_at?: string;
          confirm_token_hash?: string | null;
          confirm_sent_at?: string | null;
          confirmed_at?: string | null;
          unsubscribe_token_hash?: string | null;
          unsubscribed_at?: string | null;
          ip_hash?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          status?: Database["public"]["Enums"]["newsletter_status"];
          user_id?: string | null;
          market?: Database["public"]["Enums"]["market_code"];
          locale?: string;
          source?: string;
          consent_text?: string;
          consent_at?: string;
          confirm_token_hash?: string | null;
          confirm_sent_at?: string | null;
          confirmed_at?: string | null;
          unsubscribe_token_hash?: string | null;
          unsubscribed_at?: string | null;
          ip_hash?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      notification_reads: {
        Row: {
          notification_id: string;
          user_id: string;
          read_at: string;
        };
        Insert: {
          notification_id: string;
          user_id: string;
          read_at?: string;
        };
        Update: {
          notification_id?: string;
          user_id?: string;
          read_at?: string;
        };
        Relationships: [
          { foreignKeyName: "notification_reads_notification_id_fkey"; columns: ["notification_id"]; isOneToOne: false; referencedRelation: "notifications"; referencedColumns: ["id"] },
        ];
      };
      notifications: {
        Row: {
          id: string;
          type: string;
          title: string;
          body: string | null;
          link: string | null;
          permission: string;
          entity: string | null;
          entity_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          type: string;
          title: string;
          body?: string | null;
          link?: string | null;
          permission: string;
          entity?: string | null;
          entity_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          type?: string;
          title?: string;
          body?: string | null;
          link?: string | null;
          permission?: string;
          entity?: string | null;
          entity_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      order_addresses: {
        Row: {
          id: string;
          order_id: string;
          type: string;
          first_name: string;
          last_name: string;
          company: string | null;
          company_id: string | null;
          vat_id: string | null;
          street: string;
          city: string;
          postal_code: string;
          country: Database["public"]["Enums"]["market_code"];
          phone: string | null;
        };
        Insert: {
          id?: string;
          order_id: string;
          type: string;
          first_name: string;
          last_name: string;
          company?: string | null;
          company_id?: string | null;
          vat_id?: string | null;
          street: string;
          city: string;
          postal_code: string;
          country: Database["public"]["Enums"]["market_code"];
          phone?: string | null;
        };
        Update: {
          id?: string;
          order_id?: string;
          type?: string;
          first_name?: string;
          last_name?: string;
          company?: string | null;
          company_id?: string | null;
          vat_id?: string | null;
          street?: string;
          city?: string;
          postal_code?: string;
          country?: Database["public"]["Enums"]["market_code"];
          phone?: string | null;
        };
        Relationships: [
          { foreignKeyName: "order_addresses_order_id_fkey"; columns: ["order_id"]; isOneToOne: false; referencedRelation: "orders"; referencedColumns: ["id"] },
        ];
      };
      order_documents: {
        Row: {
          id: string;
          order_id: string;
          type: string;
          number: string | null;
          storage_path: string | null;
          external_url: string | null;
          provider: string | null;
          provider_id: string | null;
          issued_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          type: string;
          number?: string | null;
          storage_path?: string | null;
          external_url?: string | null;
          provider?: string | null;
          provider_id?: string | null;
          issued_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          type?: string;
          number?: string | null;
          storage_path?: string | null;
          external_url?: string | null;
          provider?: string | null;
          provider_id?: string | null;
          issued_at?: string;
          created_at?: string;
        };
        Relationships: [
          { foreignKeyName: "order_documents_order_id_fkey"; columns: ["order_id"]; isOneToOne: false; referencedRelation: "orders"; referencedColumns: ["id"] },
        ];
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          product_id: string | null;
          variant_id: string | null;
          sku: string;
          name: string;
          variant_name: string | null;
          image_url: string | null;
          quantity: number;
          unit_price: number;
          unit_compare_at: number | null;
          discount_amount: number;
          tax_rate_bps: number;
          tax_amount: number;
          line_total: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          product_id?: string | null;
          variant_id?: string | null;
          sku: string;
          name: string;
          variant_name?: string | null;
          image_url?: string | null;
          quantity: number;
          unit_price: number;
          unit_compare_at?: number | null;
          discount_amount?: number;
          tax_rate_bps: number;
          tax_amount: number;
          line_total: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          product_id?: string | null;
          variant_id?: string | null;
          sku?: string;
          name?: string;
          variant_name?: string | null;
          image_url?: string | null;
          quantity?: number;
          unit_price?: number;
          unit_compare_at?: number | null;
          discount_amount?: number;
          tax_rate_bps?: number;
          tax_amount?: number;
          line_total?: number;
          created_at?: string;
        };
        Relationships: [
          { foreignKeyName: "order_items_order_id_fkey"; columns: ["order_id"]; isOneToOne: false; referencedRelation: "orders"; referencedColumns: ["id"] },
          { foreignKeyName: "order_items_product_id_fkey"; columns: ["product_id"]; isOneToOne: false; referencedRelation: "products"; referencedColumns: ["id"] },
          { foreignKeyName: "order_items_variant_id_fkey"; columns: ["variant_id"]; isOneToOne: false; referencedRelation: "product_variants"; referencedColumns: ["id"] },
        ];
      };
      order_notes: {
        Row: {
          id: string;
          order_id: string;
          author_id: string | null;
          body: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          author_id?: string | null;
          body: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          author_id?: string | null;
          body?: string;
          created_at?: string;
        };
        Relationships: [
          { foreignKeyName: "order_notes_order_id_fkey"; columns: ["order_id"]; isOneToOne: false; referencedRelation: "orders"; referencedColumns: ["id"] },
        ];
      };
      order_status_history: {
        Row: {
          id: number;
          order_id: string;
          from_status: Database["public"]["Enums"]["order_status"] | null;
          to_status: Database["public"]["Enums"]["order_status"];
          actor_id: string | null;
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: never;
          order_id: string;
          from_status?: Database["public"]["Enums"]["order_status"] | null;
          to_status: Database["public"]["Enums"]["order_status"];
          actor_id?: string | null;
          note?: string | null;
          created_at?: string;
        };
        Update: {
          id?: never;
          order_id?: string;
          from_status?: Database["public"]["Enums"]["order_status"] | null;
          to_status?: Database["public"]["Enums"]["order_status"];
          actor_id?: string | null;
          note?: string | null;
          created_at?: string;
        };
        Relationships: [
          { foreignKeyName: "order_status_history_order_id_fkey"; columns: ["order_id"]; isOneToOne: false; referencedRelation: "orders"; referencedColumns: ["id"] },
        ];
      };
      orders: {
        Row: {
          id: string;
          number: string;
          user_id: string | null;
          email: string;
          phone: string | null;
          market: Database["public"]["Enums"]["market_code"];
          currency: Database["public"]["Enums"]["currency_code"];
          locale: string;
          status: Database["public"]["Enums"]["order_status"];
          payment_status: Database["public"]["Enums"]["payment_status"];
          subtotal: number;
          discount_total: number;
          shipping_total: number;
          payment_fee_total: number;
          tax_total: number;
          grand_total: number;
          vat_breakdown: Json;
          discount_id: string | null;
          discount_code_id: string | null;
          discount_code: string | null;
          shipping_method_id: string | null;
          shipping_method_name: string;
          shipping_carrier: string;
          shipping_type: Database["public"]["Enums"]["shipping_type"];
          pickup_point: Json | null;
          payment_method_code: string;
          payment_method_name: string;
          payment_provider: Database["public"]["Enums"]["payment_provider"];
          customer_note: string | null;
          is_business: boolean;
          terms_accepted_at: string;
          terms_version: string;
          marketing_consent: boolean;
          idempotency_key: string;
          access_token_hash: string;
          ip_hash: string | null;
          reservation_expires_at: string | null;
          paid_at: string | null;
          shipped_at: string | null;
          delivered_at: string | null;
          cancelled_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          number: string;
          user_id?: string | null;
          email: string;
          phone?: string | null;
          market: Database["public"]["Enums"]["market_code"];
          currency: Database["public"]["Enums"]["currency_code"];
          locale?: string;
          status?: Database["public"]["Enums"]["order_status"];
          payment_status?: Database["public"]["Enums"]["payment_status"];
          subtotal: number;
          discount_total?: number;
          shipping_total?: number;
          payment_fee_total?: number;
          tax_total?: number;
          grand_total: number;
          vat_breakdown?: Json;
          discount_id?: string | null;
          discount_code_id?: string | null;
          discount_code?: string | null;
          shipping_method_id?: string | null;
          shipping_method_name: string;
          shipping_carrier: string;
          shipping_type: Database["public"]["Enums"]["shipping_type"];
          pickup_point?: Json | null;
          payment_method_code: string;
          payment_method_name: string;
          payment_provider: Database["public"]["Enums"]["payment_provider"];
          customer_note?: string | null;
          is_business?: boolean;
          terms_accepted_at: string;
          terms_version: string;
          marketing_consent?: boolean;
          idempotency_key: string;
          access_token_hash: string;
          ip_hash?: string | null;
          reservation_expires_at?: string | null;
          paid_at?: string | null;
          shipped_at?: string | null;
          delivered_at?: string | null;
          cancelled_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          number?: string;
          user_id?: string | null;
          email?: string;
          phone?: string | null;
          market?: Database["public"]["Enums"]["market_code"];
          currency?: Database["public"]["Enums"]["currency_code"];
          locale?: string;
          status?: Database["public"]["Enums"]["order_status"];
          payment_status?: Database["public"]["Enums"]["payment_status"];
          subtotal?: number;
          discount_total?: number;
          shipping_total?: number;
          payment_fee_total?: number;
          tax_total?: number;
          grand_total?: number;
          vat_breakdown?: Json;
          discount_id?: string | null;
          discount_code_id?: string | null;
          discount_code?: string | null;
          shipping_method_id?: string | null;
          shipping_method_name?: string;
          shipping_carrier?: string;
          shipping_type?: Database["public"]["Enums"]["shipping_type"];
          pickup_point?: Json | null;
          payment_method_code?: string;
          payment_method_name?: string;
          payment_provider?: Database["public"]["Enums"]["payment_provider"];
          customer_note?: string | null;
          is_business?: boolean;
          terms_accepted_at?: string;
          terms_version?: string;
          marketing_consent?: boolean;
          idempotency_key?: string;
          access_token_hash?: string;
          ip_hash?: string | null;
          reservation_expires_at?: string | null;
          paid_at?: string | null;
          shipped_at?: string | null;
          delivered_at?: string | null;
          cancelled_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "orders_discount_code_id_fkey"; columns: ["discount_code_id"]; isOneToOne: false; referencedRelation: "discount_codes"; referencedColumns: ["id"] },
          { foreignKeyName: "orders_discount_id_fkey"; columns: ["discount_id"]; isOneToOne: false; referencedRelation: "discounts"; referencedColumns: ["id"] },
          { foreignKeyName: "orders_shipping_method_id_fkey"; columns: ["shipping_method_id"]; isOneToOne: false; referencedRelation: "shipping_methods"; referencedColumns: ["id"] },
        ];
      };
      payment_events: {
        Row: {
          id: number;
          provider: Database["public"]["Enums"]["payment_provider"];
          provider_event_id: string;
          payment_id: string | null;
          event_type: string;
          status: Database["public"]["Enums"]["payment_status"] | null;
          amount: number | null;
          payload: Json | null;
          result: string | null;
          created_at: string;
        };
        Insert: {
          id?: never;
          provider: Database["public"]["Enums"]["payment_provider"];
          provider_event_id: string;
          payment_id?: string | null;
          event_type: string;
          status?: Database["public"]["Enums"]["payment_status"] | null;
          amount?: number | null;
          payload?: Json | null;
          result?: string | null;
          created_at?: string;
        };
        Update: {
          id?: never;
          provider?: Database["public"]["Enums"]["payment_provider"];
          provider_event_id?: string;
          payment_id?: string | null;
          event_type?: string;
          status?: Database["public"]["Enums"]["payment_status"] | null;
          amount?: number | null;
          payload?: Json | null;
          result?: string | null;
          created_at?: string;
        };
        Relationships: [
          { foreignKeyName: "payment_events_payment_id_fkey"; columns: ["payment_id"]; isOneToOne: false; referencedRelation: "payments"; referencedColumns: ["id"] },
        ];
      };
      payment_method_markets: {
        Row: {
          method_code: string;
          market: Database["public"]["Enums"]["market_code"];
          fee: number;
          is_active: boolean;
        };
        Insert: {
          method_code: string;
          market: Database["public"]["Enums"]["market_code"];
          fee?: number;
          is_active?: boolean;
        };
        Update: {
          method_code?: string;
          market?: Database["public"]["Enums"]["market_code"];
          fee?: number;
          is_active?: boolean;
        };
        Relationships: [
          { foreignKeyName: "payment_method_markets_market_fkey"; columns: ["market"]; isOneToOne: false; referencedRelation: "markets"; referencedColumns: ["code"] },
          { foreignKeyName: "payment_method_markets_method_code_fkey"; columns: ["method_code"]; isOneToOne: false; referencedRelation: "payment_methods"; referencedColumns: ["code"] },
        ];
      };
      payment_methods: {
        Row: {
          code: string;
          provider: Database["public"]["Enums"]["payment_provider"];
          name: string;
          description: string | null;
          is_online: boolean;
          is_active: boolean;
          sort_order: number;
          translations: Json;
          updated_at: string;
        };
        Insert: {
          code: string;
          provider: Database["public"]["Enums"]["payment_provider"];
          name: string;
          description?: string | null;
          is_online?: boolean;
          is_active?: boolean;
          sort_order?: number;
          translations?: Json;
          updated_at?: string;
        };
        Update: {
          code?: string;
          provider?: Database["public"]["Enums"]["payment_provider"];
          name?: string;
          description?: string | null;
          is_online?: boolean;
          is_active?: boolean;
          sort_order?: number;
          translations?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };
      payments: {
        Row: {
          id: string;
          order_id: string;
          provider: Database["public"]["Enums"]["payment_provider"];
          method_code: string;
          status: Database["public"]["Enums"]["payment_status"];
          amount: number;
          currency: Database["public"]["Enums"]["currency_code"];
          provider_payment_id: string | null;
          redirect_url: string | null;
          refunded_amount: number;
          failure_reason: string | null;
          paid_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          provider: Database["public"]["Enums"]["payment_provider"];
          method_code: string;
          status?: Database["public"]["Enums"]["payment_status"];
          amount: number;
          currency: Database["public"]["Enums"]["currency_code"];
          provider_payment_id?: string | null;
          redirect_url?: string | null;
          refunded_amount?: number;
          failure_reason?: string | null;
          paid_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          provider?: Database["public"]["Enums"]["payment_provider"];
          method_code?: string;
          status?: Database["public"]["Enums"]["payment_status"];
          amount?: number;
          currency?: Database["public"]["Enums"]["currency_code"];
          provider_payment_id?: string | null;
          redirect_url?: string | null;
          refunded_amount?: number;
          failure_reason?: string | null;
          paid_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "payments_order_id_fkey"; columns: ["order_id"]; isOneToOne: false; referencedRelation: "orders"; referencedColumns: ["id"] },
        ];
      };
      price_history: {
        Row: {
          id: number;
          variant_id: string;
          market: Database["public"]["Enums"]["market_code"];
          price: number;
          valid_from: string;
        };
        Insert: {
          id?: never;
          variant_id: string;
          market: Database["public"]["Enums"]["market_code"];
          price: number;
          valid_from?: string;
        };
        Update: {
          id?: never;
          variant_id?: string;
          market?: Database["public"]["Enums"]["market_code"];
          price?: number;
          valid_from?: string;
        };
        Relationships: [
          { foreignKeyName: "price_history_variant_id_fkey"; columns: ["variant_id"]; isOneToOne: false; referencedRelation: "product_variants"; referencedColumns: ["id"] },
        ];
      };
      product_attribute_values: {
        Row: {
          id: string;
          product_id: string;
          attribute_id: string;
          value_id: string | null;
          value_number: number | null;
          value_text: string | null;
          value_boolean: boolean | null;
        };
        Insert: {
          id?: string;
          product_id: string;
          attribute_id: string;
          value_id?: string | null;
          value_number?: number | null;
          value_text?: string | null;
          value_boolean?: boolean | null;
        };
        Update: {
          id?: string;
          product_id?: string;
          attribute_id?: string;
          value_id?: string | null;
          value_number?: number | null;
          value_text?: string | null;
          value_boolean?: boolean | null;
        };
        Relationships: [
          { foreignKeyName: "product_attribute_values_attribute_id_fkey"; columns: ["attribute_id"]; isOneToOne: false; referencedRelation: "attributes"; referencedColumns: ["id"] },
          { foreignKeyName: "product_attribute_values_product_id_fkey"; columns: ["product_id"]; isOneToOne: false; referencedRelation: "products"; referencedColumns: ["id"] },
          { foreignKeyName: "product_attribute_values_value_id_fkey"; columns: ["value_id"]; isOneToOne: false; referencedRelation: "attribute_values"; referencedColumns: ["id"] },
        ];
      };
      product_categories: {
        Row: {
          product_id: string;
          category_id: string;
        };
        Insert: {
          product_id: string;
          category_id: string;
        };
        Update: {
          product_id?: string;
          category_id?: string;
        };
        Relationships: [
          { foreignKeyName: "product_categories_category_id_fkey"; columns: ["category_id"]; isOneToOne: false; referencedRelation: "categories"; referencedColumns: ["id"] },
          { foreignKeyName: "product_categories_product_id_fkey"; columns: ["product_id"]; isOneToOne: false; referencedRelation: "products"; referencedColumns: ["id"] },
        ];
      };
      product_images: {
        Row: {
          id: string;
          product_id: string;
          url: string;
          storage_path: string | null;
          alt: string | null;
          width: number | null;
          height: number | null;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          url: string;
          storage_path?: string | null;
          alt?: string | null;
          width?: number | null;
          height?: number | null;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          product_id?: string;
          url?: string;
          storage_path?: string | null;
          alt?: string | null;
          width?: number | null;
          height?: number | null;
          sort_order?: number;
          created_at?: string;
        };
        Relationships: [
          { foreignKeyName: "product_images_product_id_fkey"; columns: ["product_id"]; isOneToOne: false; referencedRelation: "products"; referencedColumns: ["id"] },
        ];
      };
      product_prices: {
        Row: {
          variant_id: string;
          market: Database["public"]["Enums"]["market_code"];
          price: number;
          compare_at_price: number | null;
          updated_at: string;
        };
        Insert: {
          variant_id: string;
          market: Database["public"]["Enums"]["market_code"];
          price: number;
          compare_at_price?: number | null;
          updated_at?: string;
        };
        Update: {
          variant_id?: string;
          market?: Database["public"]["Enums"]["market_code"];
          price?: number;
          compare_at_price?: number | null;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "product_prices_market_fkey"; columns: ["market"]; isOneToOne: false; referencedRelation: "markets"; referencedColumns: ["code"] },
          { foreignKeyName: "product_prices_variant_id_fkey"; columns: ["variant_id"]; isOneToOne: false; referencedRelation: "product_variants"; referencedColumns: ["id"] },
        ];
      };
      product_relations: {
        Row: {
          product_id: string;
          related_product_id: string;
          relation: string;
          sort_order: number;
        };
        Insert: {
          product_id: string;
          related_product_id: string;
          relation: string;
          sort_order?: number;
        };
        Update: {
          product_id?: string;
          related_product_id?: string;
          relation?: string;
          sort_order?: number;
        };
        Relationships: [
          { foreignKeyName: "product_relations_product_id_fkey"; columns: ["product_id"]; isOneToOne: false; referencedRelation: "products"; referencedColumns: ["id"] },
          { foreignKeyName: "product_relations_related_product_id_fkey"; columns: ["related_product_id"]; isOneToOne: false; referencedRelation: "products"; referencedColumns: ["id"] },
        ];
      };
      product_variants: {
        Row: {
          id: string;
          product_id: string;
          sku: string;
          ean: string | null;
          name: string | null;
          options: Json;
          image_id: string | null;
          weight_grams: number | null;
          is_default: boolean;
          is_active: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          sku: string;
          ean?: string | null;
          name?: string | null;
          options?: Json;
          image_id?: string | null;
          weight_grams?: number | null;
          is_default?: boolean;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          product_id?: string;
          sku?: string;
          ean?: string | null;
          name?: string | null;
          options?: Json;
          image_id?: string | null;
          weight_grams?: number | null;
          is_default?: boolean;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "product_variants_image_fk"; columns: ["image_id"]; isOneToOne: false; referencedRelation: "product_images"; referencedColumns: ["id"] },
          { foreignKeyName: "product_variants_product_id_fkey"; columns: ["product_id"]; isOneToOne: false; referencedRelation: "products"; referencedColumns: ["id"] },
        ];
      };
      products: {
        Row: {
          id: string;
          slug: string;
          name: string;
          subtitle: string | null;
          brand_id: string | null;
          primary_category_id: string | null;
          short_description: string | null;
          description: string | null;
          package_contents: string | null;
          tax_class: string;
          badge: string | null;
          is_active: boolean;
          is_featured: boolean;
          video_url: string | null;
          weight_grams: number | null;
          length_mm: number | null;
          width_mm: number | null;
          height_mm: number | null;
          warranty_months: number | null;
          seo_title: string | null;
          seo_description: string | null;
          translations: Json;
          search_text: string;
          rating_avg: number;
          rating_count: number;
          sold_count: number;
          published_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          subtitle?: string | null;
          brand_id?: string | null;
          primary_category_id?: string | null;
          short_description?: string | null;
          description?: string | null;
          package_contents?: string | null;
          tax_class?: string;
          badge?: string | null;
          is_active?: boolean;
          is_featured?: boolean;
          video_url?: string | null;
          weight_grams?: number | null;
          length_mm?: number | null;
          width_mm?: number | null;
          height_mm?: number | null;
          warranty_months?: number | null;
          seo_title?: string | null;
          seo_description?: string | null;
          translations?: Json;
          search_text?: string;
          rating_avg?: number;
          rating_count?: number;
          sold_count?: number;
          published_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          name?: string;
          subtitle?: string | null;
          brand_id?: string | null;
          primary_category_id?: string | null;
          short_description?: string | null;
          description?: string | null;
          package_contents?: string | null;
          tax_class?: string;
          badge?: string | null;
          is_active?: boolean;
          is_featured?: boolean;
          video_url?: string | null;
          weight_grams?: number | null;
          length_mm?: number | null;
          width_mm?: number | null;
          height_mm?: number | null;
          warranty_months?: number | null;
          seo_title?: string | null;
          seo_description?: string | null;
          translations?: Json;
          search_text?: string;
          rating_avg?: number;
          rating_count?: number;
          sold_count?: number;
          published_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "products_brand_id_fkey"; columns: ["brand_id"]; isOneToOne: false; referencedRelation: "brands"; referencedColumns: ["id"] },
          { foreignKeyName: "products_primary_category_id_fkey"; columns: ["primary_category_id"]; isOneToOne: false; referencedRelation: "categories"; referencedColumns: ["id"] },
          { foreignKeyName: "products_tax_class_fkey"; columns: ["tax_class"]; isOneToOne: false; referencedRelation: "tax_classes"; referencedColumns: ["code"] },
        ];
      };
      profiles: {
        Row: {
          id: string;
          email: string;
          first_name: string | null;
          last_name: string | null;
          phone: string | null;
          company_name: string | null;
          company_id: string | null;
          vat_id: string | null;
          role: Database["public"]["Enums"]["app_role"];
          preferred_market: Database["public"]["Enums"]["market_code"];
          is_blocked: boolean;
          blocked_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          first_name?: string | null;
          last_name?: string | null;
          phone?: string | null;
          company_name?: string | null;
          company_id?: string | null;
          vat_id?: string | null;
          role?: Database["public"]["Enums"]["app_role"];
          preferred_market?: Database["public"]["Enums"]["market_code"];
          is_blocked?: boolean;
          blocked_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          first_name?: string | null;
          last_name?: string | null;
          phone?: string | null;
          company_name?: string | null;
          company_id?: string | null;
          vat_id?: string | null;
          role?: Database["public"]["Enums"]["app_role"];
          preferred_market?: Database["public"]["Enums"]["market_code"];
          is_blocked?: boolean;
          blocked_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      rate_limits: {
        Row: {
          key: string;
          window_start: string;
          hits: number;
        };
        Insert: {
          key: string;
          window_start: string;
          hits?: number;
        };
        Update: {
          key?: string;
          window_start?: string;
          hits?: number;
        };
        Relationships: [];
      };
      recently_viewed: {
        Row: {
          user_id: string;
          product_id: string;
          viewed_at: string;
        };
        Insert: {
          user_id: string;
          product_id: string;
          viewed_at?: string;
        };
        Update: {
          user_id?: string;
          product_id?: string;
          viewed_at?: string;
        };
        Relationships: [
          { foreignKeyName: "recently_viewed_product_id_fkey"; columns: ["product_id"]; isOneToOne: false; referencedRelation: "products"; referencedColumns: ["id"] },
        ];
      };
      refunds: {
        Row: {
          id: string;
          payment_id: string;
          amount: number;
          status: string;
          reason: string | null;
          provider_refund_id: string | null;
          idempotency_key: string;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          payment_id: string;
          amount: number;
          status?: string;
          reason?: string | null;
          provider_refund_id?: string | null;
          idempotency_key: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          payment_id?: string;
          amount?: number;
          status?: string;
          reason?: string | null;
          provider_refund_id?: string | null;
          idempotency_key?: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "refunds_payment_id_fkey"; columns: ["payment_id"]; isOneToOne: false; referencedRelation: "payments"; referencedColumns: ["id"] },
        ];
      };
      return_requests: {
        Row: {
          id: string;
          order_id: string;
          user_id: string | null;
          type: Database["public"]["Enums"]["return_type"];
          status: Database["public"]["Enums"]["return_status"];
          items: Json;
          reason: string;
          bank_account: string | null;
          staff_note: string | null;
          refund_amount: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          user_id?: string | null;
          type: Database["public"]["Enums"]["return_type"];
          status?: Database["public"]["Enums"]["return_status"];
          items: Json;
          reason: string;
          bank_account?: string | null;
          staff_note?: string | null;
          refund_amount?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          user_id?: string | null;
          type?: Database["public"]["Enums"]["return_type"];
          status?: Database["public"]["Enums"]["return_status"];
          items?: Json;
          reason?: string;
          bank_account?: string | null;
          staff_note?: string | null;
          refund_amount?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "return_requests_order_id_fkey"; columns: ["order_id"]; isOneToOne: false; referencedRelation: "orders"; referencedColumns: ["id"] },
        ];
      };
      reviews: {
        Row: {
          id: string;
          product_id: string;
          user_id: string | null;
          author_name: string;
          author_city: string | null;
          rating: number;
          title: string | null;
          body: string;
          pros: string | null;
          cons: string | null;
          status: Database["public"]["Enums"]["review_status"];
          is_verified_purchase: boolean;
          admin_reply: string | null;
          published_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          user_id?: string | null;
          author_name: string;
          author_city?: string | null;
          rating: number;
          title?: string | null;
          body: string;
          pros?: string | null;
          cons?: string | null;
          status?: Database["public"]["Enums"]["review_status"];
          is_verified_purchase?: boolean;
          admin_reply?: string | null;
          published_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          product_id?: string;
          user_id?: string | null;
          author_name?: string;
          author_city?: string | null;
          rating?: number;
          title?: string | null;
          body?: string;
          pros?: string | null;
          cons?: string | null;
          status?: Database["public"]["Enums"]["review_status"];
          is_verified_purchase?: boolean;
          admin_reply?: string | null;
          published_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "reviews_product_id_fkey"; columns: ["product_id"]; isOneToOne: false; referencedRelation: "products"; referencedColumns: ["id"] },
        ];
      };
      role_permissions: {
        Row: {
          role: Database["public"]["Enums"]["app_role"];
          permission: string;
        };
        Insert: {
          role: Database["public"]["Enums"]["app_role"];
          permission: string;
        };
        Update: {
          role?: Database["public"]["Enums"]["app_role"];
          permission?: string;
        };
        Relationships: [];
      };
      shipment_events: {
        Row: {
          id: number;
          shipment_id: string;
          status: Database["public"]["Enums"]["shipment_status"];
          description: string | null;
          occurred_at: string;
          created_at: string;
        };
        Insert: {
          id?: never;
          shipment_id: string;
          status: Database["public"]["Enums"]["shipment_status"];
          description?: string | null;
          occurred_at?: string;
          created_at?: string;
        };
        Update: {
          id?: never;
          shipment_id?: string;
          status?: Database["public"]["Enums"]["shipment_status"];
          description?: string | null;
          occurred_at?: string;
          created_at?: string;
        };
        Relationships: [
          { foreignKeyName: "shipment_events_shipment_id_fkey"; columns: ["shipment_id"]; isOneToOne: false; referencedRelation: "shipments"; referencedColumns: ["id"] },
        ];
      };
      shipments: {
        Row: {
          id: string;
          order_id: string;
          carrier: string;
          tracking_number: string | null;
          tracking_url: string | null;
          status: Database["public"]["Enums"]["shipment_status"];
          provider_shipment_id: string | null;
          label_url: string | null;
          weight_grams: number | null;
          shipped_at: string | null;
          delivered_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          carrier: string;
          tracking_number?: string | null;
          tracking_url?: string | null;
          status?: Database["public"]["Enums"]["shipment_status"];
          provider_shipment_id?: string | null;
          label_url?: string | null;
          weight_grams?: number | null;
          shipped_at?: string | null;
          delivered_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          carrier?: string;
          tracking_number?: string | null;
          tracking_url?: string | null;
          status?: Database["public"]["Enums"]["shipment_status"];
          provider_shipment_id?: string | null;
          label_url?: string | null;
          weight_grams?: number | null;
          shipped_at?: string | null;
          delivered_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "shipments_order_id_fkey"; columns: ["order_id"]; isOneToOne: false; referencedRelation: "orders"; referencedColumns: ["id"] },
        ];
      };
      shipping_method_markets: {
        Row: {
          method_id: string;
          market: Database["public"]["Enums"]["market_code"];
          price: number;
          free_from: number | null;
          is_active: boolean;
        };
        Insert: {
          method_id: string;
          market: Database["public"]["Enums"]["market_code"];
          price: number;
          free_from?: number | null;
          is_active?: boolean;
        };
        Update: {
          method_id?: string;
          market?: Database["public"]["Enums"]["market_code"];
          price?: number;
          free_from?: number | null;
          is_active?: boolean;
        };
        Relationships: [
          { foreignKeyName: "shipping_method_markets_market_fkey"; columns: ["market"]; isOneToOne: false; referencedRelation: "markets"; referencedColumns: ["code"] },
          { foreignKeyName: "shipping_method_markets_method_id_fkey"; columns: ["method_id"]; isOneToOne: false; referencedRelation: "shipping_methods"; referencedColumns: ["id"] },
        ];
      };
      shipping_methods: {
        Row: {
          id: string;
          code: string;
          carrier: string;
          type: Database["public"]["Enums"]["shipping_type"];
          name: string;
          description: string | null;
          delivery_days_min: number;
          delivery_days_max: number;
          max_weight_grams: number | null;
          cod_allowed: boolean;
          is_active: boolean;
          sort_order: number;
          translations: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          carrier: string;
          type: Database["public"]["Enums"]["shipping_type"];
          name: string;
          description?: string | null;
          delivery_days_min?: number;
          delivery_days_max?: number;
          max_weight_grams?: number | null;
          cod_allowed?: boolean;
          is_active?: boolean;
          sort_order?: number;
          translations?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          carrier?: string;
          type?: Database["public"]["Enums"]["shipping_type"];
          name?: string;
          description?: string | null;
          delivery_days_min?: number;
          delivery_days_max?: number;
          max_weight_grams?: number | null;
          cod_allowed?: boolean;
          is_active?: boolean;
          sort_order?: number;
          translations?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      store_settings: {
        Row: {
          key: string;
          value: Json;
          is_public: boolean;
          description: string | null;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          key: string;
          value: Json;
          is_public?: boolean;
          description?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          key?: string;
          value?: Json;
          is_public?: boolean;
          description?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [];
      };
      tax_classes: {
        Row: {
          code: string;
          name: string;
        };
        Insert: {
          code: string;
          name: string;
        };
        Update: {
          code?: string;
          name?: string;
        };
        Relationships: [];
      };
      tax_rates: {
        Row: {
          tax_class: string;
          market: Database["public"]["Enums"]["market_code"];
          rate_bps: number;
        };
        Insert: {
          tax_class: string;
          market: Database["public"]["Enums"]["market_code"];
          rate_bps: number;
        };
        Update: {
          tax_class?: string;
          market?: Database["public"]["Enums"]["market_code"];
          rate_bps?: number;
        };
        Relationships: [
          { foreignKeyName: "tax_rates_market_fkey"; columns: ["market"]; isOneToOne: false; referencedRelation: "markets"; referencedColumns: ["code"] },
          { foreignKeyName: "tax_rates_tax_class_fkey"; columns: ["tax_class"]; isOneToOne: false; referencedRelation: "tax_classes"; referencedColumns: ["code"] },
        ];
      };
      wishlist_items: {
        Row: {
          wishlist_id: string;
          product_id: string;
          variant_id: string | null;
          created_at: string;
        };
        Insert: {
          wishlist_id: string;
          product_id: string;
          variant_id?: string | null;
          created_at?: string;
        };
        Update: {
          wishlist_id?: string;
          product_id?: string;
          variant_id?: string | null;
          created_at?: string;
        };
        Relationships: [
          { foreignKeyName: "wishlist_items_product_id_fkey"; columns: ["product_id"]; isOneToOne: false; referencedRelation: "products"; referencedColumns: ["id"] },
          { foreignKeyName: "wishlist_items_variant_id_fkey"; columns: ["variant_id"]; isOneToOne: false; referencedRelation: "product_variants"; referencedColumns: ["id"] },
          { foreignKeyName: "wishlist_items_wishlist_id_fkey"; columns: ["wishlist_id"]; isOneToOne: false; referencedRelation: "wishlists"; referencedColumns: ["id"] },
        ];
      };
      wishlists: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          is_default: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name?: string;
          is_default?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          is_default?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      admin_adjust_stock: { Args: { p_variant_id: string | null; p_delta: number | null; p_reason: Database["public"]["Enums"]["inventory_reason"] | null; p_note: string | null }; Returns: Database["public"]["Tables"]["inventory"]["Row"] };
      admin_customers: { Args: { p_query: string | null; p_page?: number | null; p_per_page?: number | null }; Returns: Json };
      admin_dashboard: { Args: { p_market: Database["public"]["Enums"]["market_code"] | null; p_days?: number | null }; Returns: Json };
      admin_duplicate_product: { Args: { p_id: string | null }; Returns: string };
      admin_import_products: { Args: { p_rows: Json | null; p_filename: string | null }; Returns: Json };
      admin_mark_notifications_read: { Args: { p_ids: string[] | null }; Returns: undefined };
      admin_save_product: { Args: { p: Json | null }; Returns: string };
      admin_search: { Args: { p_query: string | null }; Returns: Json };
      admin_set_user_blocked: { Args: { p_user_id: string | null; p_blocked: boolean | null; p_reason: string | null }; Returns: undefined };
      admin_set_user_role: { Args: { p_user_id: string | null; p_role: Database["public"]["Enums"]["app_role"] | null }; Returns: undefined };
      admin_unread_notifications: { Args: Record<PropertyKey, never>; Returns: number };
      admin_update_inventory_settings: { Args: { p_variant_id: string | null; p_low_stock_threshold: number | null; p_allow_backorder: boolean | null; p_restock_date: string | null }; Returns: undefined };
      catalog_base: { Args: { p_market: Database["public"]["Enums"]["market_code"] | null; p_category_path: string | null; p_brand_slug: string | null; p_query: string | null }; Returns: { product_id: string; brand_id: string; brand_slug: string; min_price: number; compare_at: number; available: number; rating_avg: number; rating_count: number; sold_count: number; published_at: string; is_featured: boolean; score: number }[] };
      catalog_compare: { Args: { p_ids: string[] | null; p_market: Database["public"]["Enums"]["market_code"] | null }; Returns: Json };
      catalog_facets: { Args: { p_market: Database["public"]["Enums"]["market_code"] | null; p_category_path?: string | null; p_brand_slug?: string | null; p_query?: string | null; p_brands?: string[] | null; p_filters?: Json | null; p_price_min?: number | null; p_price_max?: number | null; p_in_stock?: boolean | null; p_min_rating?: number | null; p_on_sale?: boolean | null }; Returns: Json };
      catalog_list: { Args: { p_market: Database["public"]["Enums"]["market_code"] | null; p_category_path?: string | null; p_brand_slug?: string | null; p_query?: string | null; p_brands?: string[] | null; p_filters?: Json | null; p_price_min?: number | null; p_price_max?: number | null; p_in_stock?: boolean | null; p_min_rating?: number | null; p_on_sale?: boolean | null; p_sort?: string | null; p_page?: number | null; p_per_page?: number | null }; Returns: Json };
      catalog_product: { Args: { p_slug: string | null; p_market: Database["public"]["Enums"]["market_code"] | null }; Returns: Json };
      claim_email_batch: { Args: { p_limit: number | null }; Returns: Database["public"]["Tables"]["email_outbox"]["Row"][] };
      complete_email: { Args: { p_id: string | null; p_ok: boolean | null; p_error: string | null; p_provider_id: string | null }; Returns: undefined };
      create_order: { Args: { p: Json | null }; Returns: Json };
      create_return_request: { Args: { p_order_id: string | null; p_type: Database["public"]["Enums"]["return_type"] | null; p_items: Json | null; p_reason: string | null; p_bank_account: string | null }; Returns: string };
      current_app_role: { Args: Record<PropertyKey, never>; Returns: Database["public"]["Enums"]["app_role"] };
      customer_cancel_order: { Args: { p_order_id: string | null }; Returns: Json };
      enqueue_email: { Args: { p_template: string | null; p_to: string | null; p_locale: string | null; p_payload: Json | null; p_dedupe_key: string | null }; Returns: string };
      expire_unpaid_orders: { Args: { p_limit?: number | null }; Returns: Json };
      has_perm: { Args: { p_permission: string | null }; Returns: boolean };
      immutable_unaccent: { Args: Record<PropertyKey, never>; Returns: string };
      inventory_apply: { Args: { p_variant_id: string | null; p_on_hand_delta: number | null; p_reserved_delta: number | null; p_reason: Database["public"]["Enums"]["inventory_reason"] | null; p_order_id: string | null; p_note: string | null }; Returns: Database["public"]["Tables"]["inventory"]["Row"] };
      is_staff: { Args: Record<PropertyKey, never>; Returns: boolean };
      is_system_call: { Args: Record<PropertyKey, never>; Returns: boolean };
      link_guest_orders: { Args: Record<PropertyKey, never>; Returns: number };
      log_admin_action: { Args: { p_action: string | null; p_entity: string | null; p_entity_id: string | null; p_context?: Json | null }; Returns: undefined };
      lowest_price_30d: { Args: { p_variant_id: string | null; p_market: Database["public"]["Enums"]["market_code"] | null }; Returns: number };
      market_locale: { Args: { p_market: Database["public"]["Enums"]["market_code"] | null }; Returns: string };
      my_permissions: { Args: Record<PropertyKey, never>; Returns: string[] };
      notify_staff: { Args: { p_type: string | null; p_title: string | null; p_body: string | null; p_link: string | null; p_permission: string | null; p_entity: string | null; p_entity_id: string | null }; Returns: undefined };
      order_transition: { Args: { p_order_id: string | null; p_to: Database["public"]["Enums"]["order_status"] | null; p_note?: string | null }; Returns: Json };
      payment_apply_event: { Args: { p_provider: Database["public"]["Enums"]["payment_provider"] | null; p_event_id: string | null; p_event_type: string | null; p_payment_id: string | null; p_provider_payment_id: string | null; p_status: Database["public"]["Enums"]["payment_status"] | null; p_amount: number | null; p_currency: Database["public"]["Enums"]["currency_code"] | null; p_payload?: Json | null }; Returns: Json };
      payment_attach_provider: { Args: { p_payment_id: string | null; p_provider_payment_id: string | null; p_redirect_url: string | null }; Returns: undefined };
      pricing_quote: { Args: { p_cart_id: string | null; p_market: Database["public"]["Enums"]["market_code"] | null; p_shipping_method_id?: string | null; p_payment_method_code?: string | null; p_discount_code?: string | null; p_email?: string | null; p_user_id?: string | null }; Returns: Json };
      product_cards: { Args: { p_ids: string[] | null; p_market: Database["public"]["Enums"]["market_code"] | null }; Returns: Json };
      rate_limit_hit: { Args: { p_key: string | null; p_limit: number | null; p_window_seconds: number | null }; Returns: boolean };
      refund_complete: { Args: { p_refund_id: string | null; p_succeeded: boolean | null; p_provider_refund_id: string | null }; Returns: undefined };
      refund_create: { Args: { p_payment_id: string | null; p_amount: number | null; p_reason: string | null; p_idempotency_key: string | null }; Returns: Database["public"]["Tables"]["refunds"]["Row"] };
      return_set_status: { Args: { p_id: string | null; p_status: Database["public"]["Enums"]["return_status"] | null; p_note: string | null; p_refund_amount: number | null }; Returns: undefined };
      search_normalize: { Args: Record<PropertyKey, never>; Returns: string };
      search_suggest: { Args: { p_query: string | null; p_market: Database["public"]["Enums"]["market_code"] | null; p_limit?: number | null }; Returns: Json };
      setting: { Args: { p_key: string | null }; Returns: Json };
      shipment_upsert: { Args: { p_order_id: string | null; p_shipment_id: string | null; p_carrier: string | null; p_tracking_number: string | null; p_tracking_url: string | null; p_status: Database["public"]["Enums"]["shipment_status"] | null; p_provider_shipment_id?: string | null; p_label_url?: string | null }; Returns: string };
      slugify: { Args: Record<PropertyKey, never>; Returns: string };
      stock_state: { Args: { p_available: number | null; p_backorder: boolean | null; p_threshold: number | null }; Returns: string };
      storefront_categories: { Args: { p_market: Database["public"]["Enums"]["market_code"] | null }; Returns: Json };
      storefront_home: { Args: { p_market: Database["public"]["Enums"]["market_code"] | null }; Returns: Json };
      tr: { Args: { p_translations: Json | null; p_locale: string | null; p_field: string | null; p_fallback: string | null }; Returns: string };
    };
    Enums: {
      app_role: "customer" | "support" | "warehouse" | "manager" | "admin" | "superadmin";
      attribute_type: "select" | "multiselect" | "number" | "boolean" | "text";
      banner_placement: "hero" | "promo";
      currency_code: "CZK" | "EUR";
      discount_type: "percentage" | "fixed_amount" | "free_shipping";
      inventory_reason: "initial" | "purchase" | "adjustment" | "reservation" | "reservation_release" | "sale" | "return" | "damage" | "import";
      market_code: "CZ" | "SK";
      newsletter_status: "pending" | "confirmed" | "unsubscribed";
      order_status: "new" | "awaiting_payment" | "paid" | "processing" | "ready_to_ship" | "shipped" | "delivered" | "cancelled" | "returned" | "complaint";
      payment_provider: "bank_transfer" | "cod" | "stripe" | "comgate" | "gopay";
      payment_status: "pending" | "authorized" | "paid" | "failed" | "cancelled" | "expired" | "refunded" | "partially_refunded";
      return_status: "requested" | "approved" | "received" | "refunded" | "rejected" | "resolved";
      return_type: "return" | "complaint";
      review_status: "pending" | "approved" | "hidden";
      shipment_status: "pending" | "label_created" | "handed_over" | "in_transit" | "ready_for_pickup" | "delivered" | "returned" | "cancelled";
      shipping_type: "address" | "pickup_point" | "store_pickup";
    };
    CompositeTypes: {
      quote_line: { idx: number | null; item_id: string | null; variant_id: string | null; product_id: string | null; brand_id: string | null; slug: string | null; name: string | null; variant_name: string | null; sku: string | null; image: string | null; quantity: number | null; unit_price: number | null; compare_at: number | null; tax_rate: number | null; available: number | null; backorder: boolean | null; active: boolean | null; weight: number | null; eligible: boolean | null; discount: number | null };
    };
  };
};

type PublicSchema = Database["public"];
export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"];
export type TablesInsert<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Update"];
export type Enums<T extends keyof PublicSchema["Enums"]> = PublicSchema["Enums"][T];

export const Constants = {
  public: {
    Enums: {
      app_role: ["customer", "support", "warehouse", "manager", "admin", "superadmin"],
      attribute_type: ["select", "multiselect", "number", "boolean", "text"],
      banner_placement: ["hero", "promo"],
      currency_code: ["CZK", "EUR"],
      discount_type: ["percentage", "fixed_amount", "free_shipping"],
      inventory_reason: ["initial", "purchase", "adjustment", "reservation", "reservation_release", "sale", "return", "damage", "import"],
      market_code: ["CZ", "SK"],
      newsletter_status: ["pending", "confirmed", "unsubscribed"],
      order_status: ["new", "awaiting_payment", "paid", "processing", "ready_to_ship", "shipped", "delivered", "cancelled", "returned", "complaint"],
      payment_provider: ["bank_transfer", "cod", "stripe", "comgate", "gopay"],
      payment_status: ["pending", "authorized", "paid", "failed", "cancelled", "expired", "refunded", "partially_refunded"],
      return_status: ["requested", "approved", "received", "refunded", "rejected", "resolved"],
      return_type: ["return", "complaint"],
      review_status: ["pending", "approved", "hidden"],
      shipment_status: ["pending", "label_created", "handed_over", "in_transit", "ready_for_pickup", "delivered", "returned", "cancelled"],
      shipping_type: ["address", "pickup_point", "store_pickup"],
    },
  },
} as const;
