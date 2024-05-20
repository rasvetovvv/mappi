import { gameShopCacheRepository, steamGameRepository } from "@main/repository";
import { getSteamAppDetails } from "@main/services";

import type { ShopDetails, GameShop, SteamAppDetails } from "@types";

import { registerEvent } from "../register-event";

const getLocalizedSteamAppDetails = (
  objectID: string,
  language: string
): Promise<ShopDetails | null> => {
  if (language === "english") {
    return getSteamAppDetails(objectID, language);
  }

  return Promise.all([
    steamGameRepository.findOne({ where: { id: Number(objectID) } }),
    getSteamAppDetails(objectID, language),
  ]).then(([steamGame, localizedAppDetails]) => {
    if (steamGame && localizedAppDetails) {
      return {
        ...localizedAppDetails,
        name: steamGame.name,
      };
    }

    return null;
  });
};

const getGameShopDetails = async (
  _event: Electron.IpcMainInvokeEvent,
  objectID: string,
  shop: GameShop,
  language: string
): Promise<ShopDetails | null> => {
  if (shop === "steam") {
    const cachedData = await gameShopCacheRepository.findOne({
      where: { objectID, language },
    });

    const appDetails = getLocalizedSteamAppDetails(objectID, language).then(
      (result) => {
        gameShopCacheRepository.upsert(
          {
            objectID,
            shop: "steam",
            language,
            serializedData: JSON.stringify(result),
          },
          ["objectID"]
        );

        return result;
      }
    );

    const cachedGame = cachedData?.serializedData
      ? (JSON.parse(cachedData?.serializedData) as SteamAppDetails)
      : null;

    if (cachedGame) {
      return {
        ...cachedGame,
        objectID,
      } as ShopDetails;
    }

    return Promise.resolve(appDetails);
  }

  throw new Error("Not implemented");
};

registerEvent("getGameShopDetails", getGameShopDetails);
