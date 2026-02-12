import { supabase } from '@/config/supabase';

export interface Vehicle {
  id: string;
  user_id: string;
  vin: string | null;
  make: string;
  model: string;
  year: number;
  fuel_type: string;
  default_fuel_grade: string;
  efficiency_value: number;
  efficiency_unit: string;
  efficiency_source: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateVehicleInput {
  user_id: string;
  vin?: string;
  make: string;
  model: string;
  year: number;
  fuel_type?: string;
  default_fuel_grade?: string;
  efficiency_value?: number;
  efficiency_unit?: string;
  efficiency_source?: string;
}

export const vehicleService = {
  async getByUser(userId: string): Promise<Vehicle[]> {
    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data ?? [];
  },

  async create(input: CreateVehicleInput): Promise<Vehicle> {
    const { data, error } = await supabase
      .from('vehicles')
      .insert({
        user_id: input.user_id,
        vin: input.vin ?? null,
        make: input.make,
        model: input.model,
        year: input.year,
        fuel_type: input.fuel_type ?? 'gasoline',
        default_fuel_grade: input.default_fuel_grade ?? 'regular',
        efficiency_value: input.efficiency_value ?? 0,
        efficiency_unit: input.efficiency_unit ?? 'mpg',
        efficiency_source: input.efficiency_source ?? 'manual',
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async countByUser(userId: string): Promise<number> {
    const { count, error } = await supabase
      .from('vehicles')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (error) throw error;
    return count ?? 0;
  },

  async deleteAllByUser(userId: string): Promise<void> {
    const { error } = await supabase
      .from('vehicles')
      .delete()
      .eq('user_id', userId);

    if (error) throw error;
  },

  async getById(vehicleId: string): Promise<Vehicle | null> {
    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .eq('id', vehicleId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  },

  async update(
    vehicleId: string,
    updates: Partial<Pick<Vehicle, 'efficiency_value' | 'efficiency_unit' | 'default_fuel_grade'>>,
  ): Promise<Vehicle> {
    const { data, error } = await supabase
      .from('vehicles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', vehicleId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async delete(vehicleId: string): Promise<void> {
    const { error } = await supabase
      .from('vehicles')
      .delete()
      .eq('id', vehicleId);

    if (error) throw error;
  },
};
