import api from "@/services/api";

export type State = {
  id: string;
  name: string;
  code: string | null;
}

export type City = {
  id: string;
  name: string;
}

export const getStates = async (): Promise<State[]> => {
  const response = await api.get("/Location/states");
  return response.data;
};

export const getCitiesByState = async (
  stateId: string
): Promise<City[]> => {
  const response = await api.get("/Location/cities", {
    params: { stateId },
  });

  return response.data;
};