import { useState, useCallback, useRef, useEffect } from 'react';
import {
  MenuItem,
  VehicleDetails,
  fetchMakes,
  fetchModels,
  fetchOptions,
  fetchVehicleDetails,
} from '@/services/vehicle/fuelEconomyApi';

interface LevelState {
  loading: boolean;
  error: string;
}

const CURRENT_YEAR = new Date().getFullYear();
const MIN_YEAR = 1984;
const MAX_YEAR = CURRENT_YEAR + 2;

export function useFuelEconomyLookup() {
  const [year, setYearState] = useState('');

  const [makes, setMakes] = useState<MenuItem[]>([]);
  const [models, setModels] = useState<MenuItem[]>([]);
  const [options, setOptions] = useState<MenuItem[]>([]);

  const [selectedMake, setSelectedMake] = useState<MenuItem | null>(null);
  const [selectedModel, setSelectedModel] = useState<MenuItem | null>(null);
  const [selectedOption, setSelectedOption] = useState<MenuItem | null>(null);
  const [vehicleDetails, setVehicleDetails] = useState<VehicleDetails | null>(null);

  const [makeState, setMakeState] = useState<LevelState>({ loading: false, error: '' });
  const [modelState, setModelState] = useState<LevelState>({ loading: false, error: '' });
  const [optionState, setOptionState] = useState<LevelState>({ loading: false, error: '' });
  const [detailState, setDetailState] = useState<LevelState>({ loading: false, error: '' });

  // Cancel refs for each level
  const makeCancelRef = useRef(false);
  const modelCancelRef = useRef(false);
  const optionCancelRef = useRef(false);
  const detailCancelRef = useRef(false);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      makeCancelRef.current = true;
      modelCancelRef.current = true;
      optionCancelRef.current = true;
      detailCancelRef.current = true;
    };
  }, []);

  const resetFromMake = useCallback(() => {
    makeCancelRef.current = true;
    modelCancelRef.current = true;
    optionCancelRef.current = true;
    detailCancelRef.current = true;
    setMakes([]);
    setModels([]);
    setOptions([]);
    setSelectedMake(null);
    setSelectedModel(null);
    setSelectedOption(null);
    setVehicleDetails(null);
    setMakeState({ loading: false, error: '' });
    setModelState({ loading: false, error: '' });
    setOptionState({ loading: false, error: '' });
    setDetailState({ loading: false, error: '' });
  }, []);

  const resetFromModel = useCallback(() => {
    modelCancelRef.current = true;
    optionCancelRef.current = true;
    detailCancelRef.current = true;
    setModels([]);
    setOptions([]);
    setSelectedModel(null);
    setSelectedOption(null);
    setVehicleDetails(null);
    setModelState({ loading: false, error: '' });
    setOptionState({ loading: false, error: '' });
    setDetailState({ loading: false, error: '' });
  }, []);

  const resetFromOption = useCallback(() => {
    optionCancelRef.current = true;
    detailCancelRef.current = true;
    setOptions([]);
    setSelectedOption(null);
    setVehicleDetails(null);
    setOptionState({ loading: false, error: '' });
    setDetailState({ loading: false, error: '' });
  }, []);

  const setYear = useCallback(
    (value: string) => {
      setYearState(value);
      resetFromMake();

      const num = parseInt(value, 10);
      if (value.length !== 4 || isNaN(num) || num < MIN_YEAR || num > MAX_YEAR) return;

      makeCancelRef.current = false;
      setMakeState({ loading: true, error: '' });

      fetchMakes(value)
        .then((items) => {
          if (makeCancelRef.current) return;
          setMakes(items);
          setMakeState({ loading: false, error: '' });
        })
        .catch(() => {
          if (makeCancelRef.current) return;
          setMakeState({ loading: false, error: 'Failed to load makes' });
        });
    },
    [resetFromMake],
  );

  const selectMake = useCallback(
    (item: MenuItem) => {
      resetFromModel();
      setSelectedMake(item);

      modelCancelRef.current = false;
      setModelState({ loading: true, error: '' });

      fetchModels(year, item.value)
        .then((items) => {
          if (modelCancelRef.current) return;
          setModels(items);
          setModelState({ loading: false, error: '' });
        })
        .catch(() => {
          if (modelCancelRef.current) return;
          setModelState({ loading: false, error: 'Failed to load models' });
        });
    },
    [year, resetFromModel],
  );

  const selectModel = useCallback(
    (item: MenuItem) => {
      resetFromOption();
      setSelectedModel(item);

      optionCancelRef.current = false;
      setOptionState({ loading: true, error: '' });

      fetchOptions(year, selectedMake!.value, item.value)
        .then((items) => {
          if (optionCancelRef.current) return;
          setOptions(items);
          setOptionState({ loading: false, error: '' });
        })
        .catch(() => {
          if (optionCancelRef.current) return;
          setOptionState({ loading: false, error: 'Failed to load options' });
        });
    },
    [year, selectedMake, resetFromOption],
  );

  const selectOption = useCallback((item: MenuItem) => {
    detailCancelRef.current = true;
    setSelectedOption(item);
    setVehicleDetails(null);
    setDetailState({ loading: true, error: '' });

    detailCancelRef.current = false;

    fetchVehicleDetails(item.value)
      .then((details) => {
        if (detailCancelRef.current) return;
        setVehicleDetails(details);
        setDetailState({ loading: false, error: details ? '' : 'No vehicle data found' });
      })
      .catch(() => {
        if (detailCancelRef.current) return;
        setDetailState({ loading: false, error: 'Failed to load vehicle details' });
      });
  }, []);

  return {
    year,
    setYear,
    makes,
    models,
    options,
    selectedMake,
    selectedModel,
    selectedOption,
    vehicleDetails,
    selectMake,
    selectModel,
    selectOption,
    makeLoading: makeState.loading,
    makeError: makeState.error,
    modelLoading: modelState.loading,
    modelError: modelState.error,
    optionLoading: optionState.loading,
    optionError: optionState.error,
    detailLoading: detailState.loading,
    detailError: detailState.error,
  };
}
