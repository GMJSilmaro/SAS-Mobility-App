import axios from 'axios';
import polyline from '@mapbox/polyline';

type Coordinates = {
  latitude: number;
  longitude: number;
};

export const getDirections = async (origin: Coordinates, destination: Coordinates) => {
  try {
    const response = await axios.get(
      `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.latitude},${origin.longitude}&destination=${destination.latitude},${destination.longitude}&key=${process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY}`
    );

    if (response.data.routes.length) {
      const route = response.data.routes[0];
      const points = route.overview_polyline.points;
      
      // Decode polyline points into coordinates
      const decodedCoordinates = polyline.decode(points).map(point => ({
        latitude: point[0],
        longitude: point[1]
      }));

      return {
        coordinates: decodedCoordinates,
        distance: route.legs[0].distance.text,
        duration: route.legs[0].duration.text
      };
    }
    return null;
  } catch (error) {
    console.error('Error fetching directions:', error);
    throw error;
  }
}; 