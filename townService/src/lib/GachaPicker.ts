import { TownEmitter, WardrobeItem } from '../types/CoveyTownSocket';
import Player from './Player';

export const PULL_COST = 1000;

/**
 * A class to represent the randomized gacha pull system for getting new outfits.
 */
export default class GachaPicker {
  private _itemPool: WardrobeItem[];

  private _pullCost: number;

  private _refundPercent: number;

  private _townEmitter: TownEmitter;

  // The higher the number, the more likely you are to pull an item of this rarity from the pool
  private _rarityMapping = {
    common: 10,
    rare: 5,
    ultraRare: 1,
  };

  public get itemPool(): WardrobeItem[] {
    return this._itemPool;
  }

  public get pullCost(): number {
    return this._pullCost;
  }

  public get refundPercent(): number {
    return this._refundPercent;
  }

  /**
   * Adds a new WardrobeItem to this GachaPicker
   * @param item the new item to add
   */
  public addItemToPool(item: WardrobeItem): void {
    this._itemPool.push(item);
  }

  /**
   * Creates a new GachaPicker.
   *
   * @param itemPool : the list of WardrobeItems a player can obtain
   * @param pullCost : how many CoveyCoins are needed for one pull
   * @param refundPercent : the percent of a pull that is refunded when a player gets a duplicate,
   * given as a decimal (e.g. 10% = 0.1, 100% = 1)
   */
  constructor(
    itemPool: WardrobeItem[],
    pullCost: number,
    refundPercent: number,
    townEmitter: TownEmitter,
  ) {
    this._itemPool = itemPool;
    this._pullCost = pullCost;
    this._refundPercent = refundPercent;
    this._townEmitter = townEmitter;
  }

  // returns a random item from the selection pool, accounting for item rarity
  // assumes there's at least one item in the pool
  private _getOneItem(): WardrobeItem {
    const rarityList: number[] = [];
    for (let i = 0; i < this._itemPool.length; i++) {
      const rarityIndex = i > 0 ? i - 1 : 0;
      rarityList.push(this._rarityMapping[this._itemPool[i].rarity] + rarityList[rarityIndex]);
    }

    let indexOfPulledItem = 0;
    const randomValue = Math.random() * rarityList[rarityList.length - 1];

    for (indexOfPulledItem; indexOfPulledItem < this._itemPool.length; indexOfPulledItem++) {
      if (this._rarityMapping[this._itemPool[indexOfPulledItem].rarity] > randomValue) {
        break;
      }
    }
    if (indexOfPulledItem >= 0 && indexOfPulledItem < this._itemPool.length) {
      return this._itemPool[indexOfPulledItem];
    }
    return this._itemPool[0];
  }

  /**
   * Returns a random iterm from the list of items. Randomization is affected by item weight.
   * Players are not guaranteed to receive different items on every pull.
   * If a player lacks sufficient currency to make a pull, throw an error message.
   *
   * If a player has enough currency to make a pull,
   * subtract that amount from the player's inventory
   *
   * If the player already has the item they pulled, partially refund
   * the cost of the pull. Otherwise, add the item to their inventory
   *
   * Assumes the player has enough currency to make the pull.
   *
   * Emits the pulled item to the frontend.
   * @param player the player pulling from the gacha pool
   * @throws an error if the pull pool is empty
   */
  public pull(player: Player): WardrobeItem {
    if (this._itemPool.length > 0) {
      player.wardrobe.currency -= this._pullCost;
      const pulledItem: WardrobeItem = this._getOneItem();
      const playerHasGivenItem = player.wardrobe.addWardrobeItem(pulledItem);
      if (!playerHasGivenItem) {
        // refund
        player.wardrobe.currency += this._pullCost * this._refundPercent;
      }
      // emit
      this._townEmitter.emit('playerWardrobeChanged', player.toPlayerModel());
      return pulledItem;
    }
    throw new Error('No items in the pool.');
  }
}